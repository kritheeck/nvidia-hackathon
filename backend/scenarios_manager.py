"""
NEXUS Scenarios Manager
Manages real, deterministic repositories with real source code and real pytest test suites.
Proves the complete:
First Attempt -> Real Failure -> Evidence -> Diagnosis -> Repair -> Retest -> Verified loop.
"""
import os
import shutil
from typing import Dict, Any, List

SCENARIOS_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "scenarios"))

RBAC_INITIAL_AUTH = '''"""
Authentication & Authorization Module
"""
from typing import Optional, Dict

ROLES = {
    "admin": {"level": 100},
    "member": {"level": 50},
    "guest": {"level": 10}
}

class UserContext:
    def __init__(self, username: str, role: str):
        self.username = username
        self.role = role

def authenticate_token(token: Optional[str]) -> Optional[UserContext]:
    if not token:
        return None
    tokens = {
        "admin-token-xyz": UserContext("superadmin", "admin"),
        "member-token-abc": UserContext("alice", "member"),
        "guest-token-123": UserContext("bob", "guest"),
    }
    return tokens.get(token)

def check_permission(user: Optional[UserContext], required_role: str) -> bool:
    """
    Checks if user is authorized for the given role requirement.
    NOTE: Initial flawed implementation uses strict equality rather than hierarchy.
    """
    if not user:
        return False
    # FLAW: Strict equality fails admin on member endpoints
    return user.role == required_role
'''

RBAC_REPAIRED_AUTH = '''"""
Authentication & Authorization Module
"""
from typing import Optional, Dict

ROLES = {
    "admin": {"level": 100},
    "member": {"level": 50},
    "guest": {"level": 10}
}

class UserContext:
    def __init__(self, username: str, role: str):
        self.username = username
        self.role = role

def authenticate_token(token: Optional[str]) -> Optional[UserContext]:
    if not token:
        return None
    tokens = {
        "admin-token-xyz": UserContext("superadmin", "admin"),
        "member-token-abc": UserContext("alice", "member"),
        "guest-token-123": UserContext("bob", "guest"),
    }
    return tokens.get(token)

def check_permission(user: Optional[UserContext], required_role: str) -> bool:
    """
    Checks if user is authorized for the given role requirement.
    REPAIRED: Admin role inherits all member privileges hierarchically.
    """
    if not user:
        return False
    
    if user.role == "admin":
        return True
        
    if required_role == "member" and user.role in ["admin", "member"]:
        return True
        
    return user.role == required_role
'''

RBAC_APP_CODE = '''"""
Workspace API Service
"""
from auth import authenticate_token, check_permission

class MockResponse:
    def __init__(self, status_code: int, data: dict):
        self.status_code = status_code
        self.data = data

def handle_request(path: str, token: str = None) -> MockResponse:
    if path == "/api/public":
        return MockResponse(200, {"status": "online", "access": "public"})

    user = authenticate_token(token)
    if not user:
        return MockResponse(401, {"error": "Unauthorized: Missing or invalid token"})

    if path == "/api/member-dashboard":
        if not check_permission(user, "member"):
            return MockResponse(403, {"error": "Forbidden: Requires member role"})
        return MockResponse(200, {"status": "ok", "user": user.username, "view": "member-dashboard"})

    if path == "/api/admin":
        if not check_permission(user, "admin"):
            return MockResponse(403, {"error": "Forbidden: Requires admin role"})
        return MockResponse(200, {"status": "ok", "user": user.username, "view": "admin-control"})

    return MockResponse(404, {"error": "Not Found"})
'''

RBAC_TEST_CODE = '''"""
Comprehensive RBAC Test Suite
Tests authentication, authorization, role hierarchy, and regression boundaries.
"""
import pytest
from app import handle_request

def test_public_endpoint():
    res = handle_request("/api/public")
    assert res.status_code == 200
    assert res.data["access"] == "public"

def test_unauthenticated_request_fails():
    res = handle_request("/api/admin", token=None)
    assert res.status_code == 401

def test_member_access():
    res = handle_request("/api/member-dashboard", token="member-token-abc")
    assert res.status_code == 200
    assert res.data["view"] == "member-dashboard"

def test_member_denied_admin():
    res = handle_request("/api/admin", token="member-token-abc")
    assert res.status_code == 403

def test_admin_access():
    res = handle_request("/api/admin", token="admin-token-xyz")
    assert res.status_code == 200
    assert res.data["view"] == "admin-control"

def test_admin_inherits_member_permission():
    """
    CRITICAL REGRESSION TEST:
    Admins must inherit member permissions to access member dashboards.
    """
    res = handle_request("/api/member-dashboard", token="admin-token-xyz")
    assert res.status_code == 200
    assert res.data["user"] == "superadmin"

def test_guest_forbidden():
    res = handle_request("/api/member-dashboard", token="guest-token-123")
    assert res.status_code == 403
'''

# --- Cache Leak Scenario Source Files ---

CACHE_INITIAL_CODE = '''"""
Session Cache Manager
Manages user session data with bounded storage.
"""
import threading
from typing import Any, Optional

class SessionCache:
    """
    FLAW: No eviction policy and not thread-safe.
    Cache grows unboundedly beyond max_size limit.
    """
    def __init__(self, max_size: int = 5):
        self.max_size = max_size
        self._cache = {}
        # Missing: lock for thread safety

    def set(self, key: str, value: Any) -> None:
        # FLAW: No eviction when full — just keeps inserting indefinitely
        self._cache[key] = value

    def get(self, key: str) -> Optional[Any]:
        return self._cache.get(key)

    def delete(self, key: str) -> bool:
        if key in self._cache:
            del self._cache[key]
            return True
        return False

    def size(self) -> int:
        return len(self._cache)

    def clear(self) -> None:
        self._cache.clear()
'''

CACHE_REPAIRED_CODE = '''"""
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
'''

CACHE_TEST_CODE = '''"""
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
'''


SCENARIOS = {
    "rbac_guard": {
        "id": "rbac_guard",
        "title": "RBAC Role Hierarchy & Regression Guard",
        "objective": "Enforce hierarchical role inheritance so admin users seamlessly access member workspace settings without 403 Forbidden errors.",
        "difficulty": "Intermediate",
        "stack": "Python / Fast-Pytest / Auth",
        "files_involved": ["auth.py", "app.py", "test_rbac.py"]
    },
    "cache_leak": {
        "id": "cache_leak",
        "title": "Session Cache Boundary & Eviction Fix",
        "objective": "Prevent unbounded dictionary growth in session cache by adding LRU eviction and thread-safe limits.",
        "difficulty": "Advanced",
        "stack": "Python / Concurrency",
        "files_involved": ["cache.py", "test_cache.py"]
    }
}


class ScenariosManager:
    def __init__(self, base_dir: str = SCENARIOS_BASE_DIR):
        self.base_dir = os.path.abspath(base_dir)
        os.makedirs(self.base_dir, exist_ok=True)

    def list_scenarios(self) -> List[Dict[str, Any]]:
        return list(SCENARIOS.values())

    def provision_scenario(self, scenario_id: str = "rbac_guard") -> str:
        """
        Creates real files on disk for the given scenario so real pytest runs against it.
        Returns the absolute path to the provisioned repository.
        """
        repo_dir = os.path.join(self.base_dir, scenario_id)
        os.makedirs(repo_dir, exist_ok=True)

        if scenario_id == "rbac_guard":
            with open(os.path.join(repo_dir, "auth.py"), "w", encoding="utf-8") as f:
                f.write(RBAC_INITIAL_AUTH)
            with open(os.path.join(repo_dir, "app.py"), "w", encoding="utf-8") as f:
                f.write(RBAC_APP_CODE)
            with open(os.path.join(repo_dir, "test_rbac.py"), "w", encoding="utf-8") as f:
                f.write(RBAC_TEST_CODE)
            with open(os.path.join(repo_dir, "pytest.ini"), "w", encoding="utf-8") as f:
                f.write("[pytest]\npython_files = test_*.py\n")

        elif scenario_id == "cache_leak":
            with open(os.path.join(repo_dir, "cache.py"), "w", encoding="utf-8") as f:
                f.write(CACHE_INITIAL_CODE)
            with open(os.path.join(repo_dir, "test_cache.py"), "w", encoding="utf-8") as f:
                f.write(CACHE_TEST_CODE)
            with open(os.path.join(repo_dir, "pytest.ini"), "w", encoding="utf-8") as f:
                f.write("[pytest]\npython_files = test_*.py\n")

        return repo_dir

    def get_repair_patch(self, scenario_id: str) -> Dict[str, str]:
        """Returns the targeted surgical repair for the scenario"""
        if scenario_id == "rbac_guard":
            return {"auth.py": RBAC_REPAIRED_AUTH}
        if scenario_id == "cache_leak":
            return {"cache.py": CACHE_REPAIRED_CODE}
        return {}

    def get_initial_file_content(self, scenario_id: str, filename: str) -> str:
        if scenario_id == "rbac_guard" and filename == "auth.py":
            return RBAC_INITIAL_AUTH
        if scenario_id == "cache_leak" and filename == "cache.py":
            return CACHE_INITIAL_CODE
        return ""
