import hashlib
import time
from typing import Any


class TTLCache:
    def __init__(self, ttl_seconds: int = 3600):
        self._store: dict[str, tuple[Any, float]] = {}
        self._ttl = ttl_seconds

    def make_key(self, prompt: str, model: str) -> str:
        return hashlib.md5(f"{prompt}{model}".encode()).hexdigest()

    def get(self, key: str) -> Any | None:
        if key in self._store:
            value, expires_at = self._store[key]
            if time.monotonic() < expires_at:
                return value
            del self._store[key]
        return None

    def set(self, key: str, value: Any) -> None:
        self._store[key] = (value, time.monotonic() + self._ttl)
