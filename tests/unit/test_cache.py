import time
from src.llm.cache import TTLCache


def test_cache_miss_returns_none():
    cache = TTLCache(ttl_seconds=60)
    assert cache.get("key") is None


def test_cache_hit_returns_value():
    cache = TTLCache(ttl_seconds=60)
    cache.set("key", {"data": 42})
    assert cache.get("key") == {"data": 42}


def test_cache_expired_returns_none():
    cache = TTLCache(ttl_seconds=0)
    cache.set("key", "value")
    time.sleep(0.01)
    assert cache.get("key") is None


def test_cache_key_is_hash_of_inputs():
    cache = TTLCache(ttl_seconds=60)
    key = cache.make_key("prompt text", "model-name")
    assert isinstance(key, str) and len(key) == 32
