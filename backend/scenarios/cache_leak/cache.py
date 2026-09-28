"""
Session Cache Manager
Manages user session data with LRU eviction and thread-safe bounded storage.
"""
import threading
from collections import OrderedDict
from typing import Any, Optional

class SessionCache:
    """
    REPAIRED: LRU eviction policy with thread-safe access and bounded max_size.
    Uses OrderedDict to track insertion/access order for LRU semantics.
    """
    def __init__(self, max_size: int = 5):
        self.max_size = max_size
        self._cache: OrderedDict = OrderedDict()
        self._lock = threading.Lock()

    def set(self, key: str, value: Any) -> None:
        with self._lock:
            if key in self._cache:
                # Move to end (most recently used)
                self._cache.move_to_end(key)
            self._cache[key] = value
            # Evict least recently used if over capacity
            while len(self._cache) > self.max_size:
                self._cache.popitem(last=False)

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            if key not in self._cache:
                return None
            # Mark as recently used
            self._cache.move_to_end(key)
            return self._cache[key]

    def delete(self, key: str) -> bool:
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False

    def size(self) -> int:
        with self._lock:
            return len(self._cache)

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()
