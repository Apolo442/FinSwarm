from __future__ import annotations
import asyncio, gzip, json, time
from datetime import timedelta
from typing import Any, Callable, Awaitable
from pathlib import Path
import aiosqlite
from cachetools import TTLCache

_DB_PATH = "data/stock_cache.db"
_memory_cache: TTLCache = TTLCache(maxsize=512, ttl=600)


async def init_cache_db() -> None:
    Path(_DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(_DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS cache_entries (
              key TEXT PRIMARY KEY,
              value BLOB NOT NULL,
              expires_at INTEGER NOT NULL
            )
        """)
        await db.execute("CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache_entries(expires_at)")
        await db.execute("DELETE FROM cache_entries WHERE expires_at < ?", (int(time.time()),))
        await db.commit()


async def _sqlite_get(key: str) -> Any | None:
    async with aiosqlite.connect(_DB_PATH) as db:
        async with db.execute("SELECT value, expires_at FROM cache_entries WHERE key = ?", (key,)) as cur:
            row = await cur.fetchone()
    if row is None: return None
    value_blob, expires_at = row
    if expires_at < int(time.time()): return None
    return json.loads(gzip.decompress(value_blob))


async def _sqlite_put(key: str, value: Any, ttl: timedelta) -> None:
    blob = gzip.compress(json.dumps(value, default=str).encode())
    expires_at = int(time.time() + ttl.total_seconds())
    async with aiosqlite.connect(_DB_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO cache_entries (key, value, expires_at) VALUES (?, ?, ?)",
            (key, blob, expires_at),
        )
        await db.commit()


async def get_or_fetch(
    key: str,
    ttl: timedelta,
    fetcher: Callable[[], Any] | Callable[[], Awaitable[Any]],
) -> Any:
    if key in _memory_cache:
        return _memory_cache[key]
    value = await _sqlite_get(key)
    if value is not None:
        _memory_cache[key] = value
        return value
    result = fetcher()
    if asyncio.iscoroutine(result):
        result = await result
    await _sqlite_put(key, result, ttl)
    _memory_cache[key] = result
    return result
