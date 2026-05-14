import asyncio
import pytest
from datetime import timedelta
from src.cache import get_or_fetch, init_cache_db, _memory_cache


@pytest.fixture(autouse=True)
async def reset_cache(tmp_path, monkeypatch):
    monkeypatch.setattr("src.cache._DB_PATH", str(tmp_path / "test_cache.db"))
    _memory_cache.clear()
    await init_cache_db()
    yield


@pytest.mark.asyncio
async def test_memory_cache_hit():
    calls = 0
    def fetcher():
        nonlocal calls
        calls += 1
        return {"x": 1}
    r1 = await get_or_fetch("k1", timedelta(seconds=60), fetcher)
    r2 = await get_or_fetch("k1", timedelta(seconds=60), fetcher)
    assert r1 == r2 == {"x": 1}
    assert calls == 1


@pytest.mark.asyncio
async def test_sqlite_hit_after_memory_clear():
    calls = 0
    def fetcher():
        nonlocal calls
        calls += 1
        return {"y": 2}
    await get_or_fetch("k2", timedelta(seconds=60), fetcher)
    _memory_cache.clear()
    r2 = await get_or_fetch("k2", timedelta(seconds=60), fetcher)
    assert r2 == {"y": 2}
    assert calls == 1


@pytest.mark.asyncio
async def test_ttl_expiry_refetches():
    calls = 0
    def fetcher():
        nonlocal calls; calls += 1
        return calls
    r1 = await get_or_fetch("k3", timedelta(seconds=-1), fetcher)
    _memory_cache.clear()
    r2 = await get_or_fetch("k3", timedelta(seconds=60), fetcher)
    assert r1 == 1 and r2 == 2 and calls == 2


@pytest.mark.asyncio
async def test_async_fetcher_supported():
    async def afetcher():
        return {"async": True}
    r = await get_or_fetch("k4", timedelta(seconds=60), afetcher)
    assert r == {"async": True}
