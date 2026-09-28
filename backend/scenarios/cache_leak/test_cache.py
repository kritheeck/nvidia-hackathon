"""
Comprehensive Session Cache Test Suite
Tests bounded growth, LRU eviction, thread safety, and API correctness.
"""
import threading
import pytest
from cache import SessionCache

def test_basic_set_get():
    cache = SessionCache(max_size=3)
    cache.set("user:1", {"name": "Alice"})
    assert cache.get("user:1") == {"name": "Alice"}

def test_eviction_when_full():
    """
    CRITICAL: Cache must not grow beyond max_size.
    Oldest (LRU) entry must be evicted when capacity is exceeded.
    """
    cache = SessionCache(max_size=3)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.set("c", 3)
    cache.set("d", 4)  # should evict "a"
    assert cache.size() <= 3

def test_oldest_evicted_first():
    cache = SessionCache(max_size=3)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.set("c", 3)
    cache.set("d", 4)  # evict "a"
    assert cache.get("a") is None
    assert cache.get("b") is not None

def test_get_marks_recently_used():
    cache = SessionCache(max_size=3)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.set("c", 3)
    cache.get("a")      # touch "a" so it becomes most recently used
    cache.set("d", 4)   # should evict "b" not "a"
    assert cache.get("a") is not None
    assert cache.get("b") is None

def test_delete():
    cache = SessionCache(max_size=5)
    cache.set("x", 42)
    assert cache.delete("x") is True
    assert cache.get("x") is None
    assert cache.delete("x") is False

def test_thread_safety():
    """
    CRITICAL: Concurrent reads/writes must not corrupt the cache.
    """
    cache = SessionCache(max_size=10)
    errors = []

    def writer(n):
        try:
            for i in range(20):
                cache.set(f"key:{n}:{i}", i)
        except Exception as e:
            errors.append(e)

    threads = [threading.Thread(target=writer, args=(t,)) for t in range(5)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert len(errors) == 0
    assert cache.size() <= 10

def test_clear():
    cache = SessionCache(max_size=5)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.clear()
    assert cache.size() == 0
