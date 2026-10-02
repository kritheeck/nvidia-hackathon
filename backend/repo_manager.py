"""
NEXUS Repository Manager
Manages real, functional Git repositories on disk:
- Clones real repositories from GitHub URLs
- Connects to existing local repository folders
- Pre-provisions real, initialized Git repositories for testing (RBAC API, Session Cache, Task API)
- Provides safe file reading, writing, and tree inspection
"""
import os
import sys
import json
import shutil
import subprocess
import pathlib
from typing import Dict, Any, List, Optional

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from repository_intel import RepositoryIntel

REPOS_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "repos"))
REGISTRY_FILE = os.path.join(REPOS_BASE_DIR, "registry.json")

# Starter Repo 1: RBAC API Service
RBAC_FILES = {
    "auth.py": '''"""
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
    Admin users should have access to member and guest resources.
    """
    if not user:
        return False
    # FLAW: Strict equality fails admin on member endpoints
    return user.role == required_role
''',
    "app.py": '''"""
Workspace API Service
"""
from auth import authenticate_token, check_permission

class MockResponse:
    def __init__(self, status_code: int, data: dict):
        self.status_code = status_code
        self.data = data

def handle_request(path: str, token: str) -> MockResponse:
    user = authenticate_token(token)
    
    if path == "/api/public":
        return MockResponse(200, {"message": "Public data"})
        
    if not user:
        return MockResponse(401, {"error": "Unauthorized: Invalid or missing token"})
        
    if path == "/api/admin/system":
        if check_permission(user, "admin"):
            return MockResponse(200, {"status": "System operational", "role": user.role})
        return MockResponse(403, {"error": "Forbidden: Admin role required"})
        
    if path == "/api/member/workspace":
        if check_permission(user, "member"):
            return MockResponse(200, {"workspace": "Engineering", "user": user.username})
        return MockResponse(403, {"error": "Forbidden: Member role required"})
        
    return MockResponse(404, {"error": "Endpoint not found"})
''',
    "test_rbac.py": '''"""
Test Suite for Role-Based Access Control
"""
import pytest
from app import handle_request

def test_public_endpoint():
    res = handle_request("/api/public", token="")
    assert res.status_code == 200

def test_unauthenticated_request_fails():
    res = handle_request("/api/member/workspace", token="")
    assert res.status_code == 401

def test_member_access():
    res = handle_request("/api/member/workspace", token="member-token-abc")
    assert res.status_code == 200

def test_member_denied_admin():
    res = handle_request("/api/admin/system", token="member-token-abc")
    assert res.status_code == 403

def test_admin_access():
    res = handle_request("/api/admin/system", token="admin-token-xyz")
    assert res.status_code == 200

def test_admin_inherits_member_permission():
    """
    CRITICAL TEST: Admin must hierarchically access member endpoints.
    """
    res = handle_request("/api/member/workspace", token="admin-token-xyz")
    assert res.status_code == 200, f"Expected 200 OK for admin accessing member workspace, got {res.status_code}"

def test_guest_forbidden():
    res = handle_request("/api/member/workspace", token="guest-token-123")
    assert res.status_code == 403
''',
    "pytest.ini": "[pytest]\npython_files = test_*.py\n",
    "README.md": "# RBAC Service\nRole-Based Access Control and Permission Hierarchy Service.\n"
}

# Starter Repo 2: Session Cache Service
CACHE_FILES = {
    "cache.py": '''"""
In-Memory Session Cache
"""
import time
import threading
from typing import Any, Optional, Dict

class SessionCache:
    def __init__(self, max_size: int = 100, default_ttl_sec: int = 300):
        self.max_size = max_size
        self.default_ttl = default_ttl_sec
        # FLAW: plain dict without thread safety or eviction limits
        self._store: Dict[str, Any] = {}
        self._lock = threading.Lock()

    def set(self, key: str, value: Any, ttl_sec: Optional[int] = None) -> None:
        with self._lock:
            # Bug: unbounded growth beyond max_size
            self._store[key] = {
                "value": value,
                "expires": time.time() + (ttl_sec or self.default_ttl)
            }

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            item = self._store.get(key)
            if not item:
                return None
            if time.time() > item["expires"]:
                del self._store[key]
                return None
            return item["value"]

    def delete(self, key: str) -> bool:
        with self._lock:
            if key in self._store:
                del self._store[key]
                return True
            return False

    def size(self) -> int:
        with self._lock:
            return len(self._store)

    def clear(self) -> None:
        with self._lock:
            self._store.clear()
''',
    "test_cache.py": '''"""
Test Suite for Session Cache
"""
import time
import threading
import pytest
from cache import SessionCache

def test_basic_set_get():
    cache = SessionCache(max_size=10)
    cache.set("user:1", {"name": "Alice"})
    assert cache.get("user:1") == {"name": "Alice"}

def test_missing_key():
    cache = SessionCache(max_size=10)
    assert cache.get("nonexistent") is None

def test_ttl_expiry():
    cache = SessionCache(max_size=10, default_ttl_sec=1)
    cache.set("temp", "val", ttl_sec=1)
    assert cache.get("temp") == "val"
    time.sleep(1.1)
    assert cache.get("temp") is None

def test_capacity_bound():
    """
    CRITICAL: Cache must enforce max_size boundary and not exceed it.
    """
    cache = SessionCache(max_size=3)
    cache.set("k1", 1)
    cache.set("k2", 2)
    cache.set("k3", 3)
    cache.set("k4", 4)
    assert cache.size() <= 3, f"Cache size {cache.size()} exceeded max_size 3"

def test_thread_safety():
    cache = SessionCache(max_size=50)
    errors = []
    def worker(idx):
        try:
            for i in range(20):
                cache.set(f"key_{idx}_{i}", i)
                cache.get(f"key_{idx}_{i}")
        except Exception as e:
            errors.append(e)

    threads = [threading.Thread(target=worker, args=(t,)) for t in range(5)]
    for t in threads: t.start()
    for t in threads: t.join()

    assert len(errors) == 0
''',
    "pytest.ini": "[pytest]\npython_files = test_*.py\n",
    "README.md": "# Session Cache Service\nHigh-concurrency LRU session cache with TTL eviction.\n"
}

# Starter Repo 3: Task Manager API
TASK_API_FILES = {
    "tasks.py": '''"""
Task Management Logic with Status Transitions
"""
from typing import Dict, List, Optional
import uuid

class Task:
    VALID_STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"]

    def __init__(self, title: str, priority: str = "medium", status: str = "TODO"):
        self.id = str(uuid.uuid4())[:8]
        self.title = title
        self.priority = priority
        self.status = status

    def update_status(self, new_status: str) -> bool:
        if new_status not in self.VALID_STATUSES:
            raise ValueError(f"Invalid status: {new_status}")
        self.status = new_status
        return True

class TaskManager:
    def __init__(self):
        self._tasks: Dict[str, Task] = {}

    def create_task(self, title: str, priority: str = "medium") -> Task:
        if not title or len(title.strip()) == 0:
            raise ValueError("Task title cannot be empty")
        task = Task(title.strip(), priority)
        self._tasks[task.id] = task
        return task

    def get_task(self, task_id: str) -> Optional[Task]:
        return self._tasks.get(task_id)

    def list_tasks(self, status: Optional[str] = None) -> List[Task]:
        tasks = list(self._tasks.values())
        if status:
            return [t for t in tasks if t.status == status]
        return tasks

    def delete_task(self, task_id: str) -> bool:
        if task_id in self._tasks:
            del self._tasks[task_id]
            return True
        return False
''',
    "test_tasks.py": '''"""
Test Suite for Task Manager
"""
import pytest
from tasks import TaskManager, Task

def test_create_task():
    tm = TaskManager()
    t = tm.create_task("Fix auth bug", priority="high")
    assert t.title == "Fix auth bug"
    assert t.priority == "high"
    assert t.status == "TODO"

def test_empty_title_fails():
    tm = TaskManager()
    with pytest.raises(ValueError):
        tm.create_task("   ")

def test_update_status():
    tm = TaskManager()
    t = tm.create_task("Write unit tests")
    assert t.update_status("IN_PROGRESS") is True
    assert t.status == "IN_PROGRESS"

def test_invalid_status_raises():
    tm = TaskManager()
    t = tm.create_task("Test task")
    with pytest.raises(ValueError):
        t.update_status("INVALID_STATUS")

def test_list_and_filter():
    tm = TaskManager()
    t1 = tm.create_task("Task 1")
    t2 = tm.create_task("Task 2")
    t2.update_status("DONE")
    assert len(tm.list_tasks()) == 2
    assert len(tm.list_tasks(status="DONE")) == 1
''',
    "pytest.ini": "[pytest]\npython_files = test_*.py\n",
    "README.md": "# Task Manager Service\nIn-memory task tracking with state lifecycle validation.\n"
}


class RepositoryManager:
    def __init__(self, base_dir: str = REPOS_BASE_DIR):
        self.base_dir = os.path.abspath(base_dir)
        os.makedirs(self.base_dir, exist_ok=True)
        self.registry_file = os.path.join(self.base_dir, "registry.json")
        self._ensure_starter_repos()
        self.active_repo_id = self._get_default_active_repo()

    def _load_registry(self) -> List[Dict[str, Any]]:
        if os.path.exists(self.registry_file):
            try:
                with open(self.registry_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return []
        return []

    def _save_registry(self, repos: List[Dict[str, Any]]):
        with open(self.registry_file, "w", encoding="utf-8") as f:
            json.dump(repos, f, indent=2)

    def _ensure_git_init(self, path: str, commit_msg: str = "Initial commit"):
        """Initializes a local git repository if not already initialized."""
        git_dir = os.path.join(path, ".git")
        if not os.path.exists(git_dir):
            try:
                subprocess.run(["git", "init"], cwd=path, check=True, capture_output=True)
                subprocess.run(["git", "config", "user.name", "NEXUS Agent"], cwd=path, check=False, capture_output=True)
                subprocess.run(["git", "config", "user.email", "nexus@agent.ai"], cwd=path, check=False, capture_output=True)
                subprocess.run(["git", "add", "."], cwd=path, check=False, capture_output=True)
                subprocess.run(["git", "commit", "-m", commit_msg], cwd=path, check=False, capture_output=True)
            except Exception as e:
                print(f"[RepoManager] Git init error for {path}: {e}")

    def _provision_starter(self, folder_name: str, files_dict: Dict[str, str], repo_id: str, title: str, description: str):
        target_dir = os.path.join(self.base_dir, folder_name)
        os.makedirs(target_dir, exist_ok=True)
        for fname, content in files_dict.items():
            fpath = os.path.join(target_dir, fname)
            if not os.path.exists(fpath):
                with open(fpath, "w", encoding="utf-8") as f:
                    f.write(content)
        self._ensure_git_init(target_dir, f"Initialize {title}")

    def _ensure_starter_repos(self):
        """Provisions actual git repositories on disk for testing."""
        self._provision_starter(
            "rbac-service",
            RBAC_FILES,
            "rbac-service",
            "RBAC Role Hierarchy API",
            "Authentication & authorization service with hierarchical role inheritance."
        )
        self._provision_starter(
            "session-cache-service",
            CACHE_FILES,
            "session-cache-service",
            "Session Cache Engine",
            "Thread-safe in-memory session cache with LRU eviction and TTL."
        )
        self._provision_starter(
            "task-manager-api",
            TASK_API_FILES,
            "task-manager-api",
            "Task Manager API",
            "Stateful task tracking service with transition validation and pytest suite."
        )

        registry = self._load_registry()
        reg_ids = {r["id"] for r in registry}

        starters = [
            {
                "id": "rbac-service",
                "name": "RBAC Role Hierarchy API",
                "path": os.path.join(self.base_dir, "rbac-service"),
                "source_type": "starter",
                "description": "Authentication and authorization service with role hierarchy validation.",
                "default_objective": "Enforce hierarchical role inheritance so admin users seamlessly access member workspace settings without 403 Forbidden errors.",
            },
            {
                "id": "session-cache-service",
                "name": "Session Cache Engine",
                "path": os.path.join(self.base_dir, "session-cache-service"),
                "source_type": "starter",
                "description": "Thread-safe LRU cache service with capacity boundaries and TTL expiration.",
                "default_objective": "Prevent unbounded dictionary growth in session cache by adding LRU eviction and thread-safe limits.",
            },
            {
                "id": "task-manager-api",
                "name": "Task Manager Service",
                "path": os.path.join(self.base_dir, "task-manager-api"),
                "source_type": "starter",
                "description": "Task management engine with lifecycle validation and test assertions.",
                "default_objective": "Add status transition guards and ensure task titles cannot be whitespace-only.",
            }
        ]

        for s in starters:
            if s["id"] not in reg_ids:
                registry.append(s)

        self._save_registry(registry)

    def _get_default_active_repo(self) -> str:
        registry = self._load_registry()
        if registry:
            return registry[0]["id"]
        return "rbac-service"

    def list_repositories(self) -> List[Dict[str, Any]]:
        """Returns metadata for all registered repositories with live AST discovery."""
        registry = self._load_registry()
        enriched = []
        for r in registry:
            path = r.get("path")
            if not path or not os.path.exists(path):
                continue

            intel = RepositoryIntel(path)
            analysis = intel.analyze()

            # Git branch info
            branch = "main"
            try:
                out = subprocess.run(
                    ["git", "branch", "--show-current"],
                    cwd=path,
                    capture_output=True,
                    text=True,
                    timeout=3
                )
                if out.returncode == 0 and out.stdout.strip():
                    branch = out.stdout.strip()
            except Exception:
                pass

            enriched.append({
                "id": r["id"],
                "name": r.get("name", os.path.basename(path)),
                "path": path,
                "source_type": r.get("source_type", "local"),
                "remote_url": r.get("remote_url"),
                "branch": branch,
                "description": r.get("description", ""),
                "default_objective": r.get("default_objective", ""),
                "framework": analysis.get("framework", "Python"),
                "language": analysis.get("language", "Python"),
                "test_command": analysis.get("test_command", "pytest -v"),
                "total_files": analysis.get("total_files", 0),
                "has_tests": analysis.get("has_tests", False),
                "files": analysis.get("files", []),
                "is_active": (r["id"] == self.active_repo_id)
            })
        return enriched

    def get_repo(self, repo_id: str) -> Optional[Dict[str, Any]]:
        repos = self.list_repositories()
        for r in repos:
            if r["id"] == repo_id:
                return r
        return None

    def get_active_repo(self) -> Dict[str, Any]:
        repo = self.get_repo(self.active_repo_id)
        if not repo:
            repos = self.list_repositories()
            if repos:
                self.active_repo_id = repos[0]["id"]
                return repos[0]
            # fallback
            return {
                "id": "rbac-service",
                "name": "RBAC Role Hierarchy API",
                "path": os.path.join(self.base_dir, "rbac-service"),
                "source_type": "starter",
                "framework": "FastAPI / Python Web API",
                "files": ["auth.py", "app.py", "test_rbac.py", "pytest.ini"]
            }
        return repo

    def set_active_repo(self, repo_id: str) -> bool:
        repos = self.list_repositories()
        for r in repos:
            if r["id"] == repo_id:
                self.active_repo_id = repo_id
                return True
        return False

    def clone_github_repo(self, url: str, custom_name: Optional[str] = None) -> Dict[str, Any]:
        """Clones a real GitHub repository using `git clone`."""
        url = url.strip()
        if not url.startswith("http://") and not url.startswith("https://") and not url.startswith("git@"):
            raise ValueError("Invalid Git repository URL. Must start with https:// or git@")

        # Derive folder name
        repo_name = custom_name or url.rstrip("/").split("/")[-1].replace(".git", "")
        clean_name = "".join(c for c in repo_name if c.isalnum() or c in ("-", "_")).lower()
        if not clean_name:
            clean_name = f"repo-{int(os.getpid())}"

        target_dir = os.path.join(self.base_dir, clean_name)
        if os.path.exists(target_dir):
            # Already cloned, update origin
            try:
                subprocess.run(["git", "pull"], cwd=target_dir, check=False, capture_output=True, timeout=15)
            except Exception:
                pass
        else:
            try:
                res = subprocess.run(
                    ["git", "clone", "--depth", "1", url, target_dir],
                    capture_output=True,
                    text=True,
                    timeout=45
                )
                if res.returncode != 0:
                    raise RuntimeError(f"Git clone failed: {res.stderr}")
            except subprocess.TimeoutExpired:
                raise TimeoutError("Git clone timed out after 45 seconds.")

        repo_entry = {
            "id": clean_name,
            "name": clean_name,
            "path": target_dir,
            "source_type": "github",
            "remote_url": url,
            "description": f"Cloned from {url}",
            "default_objective": "Analyze codebase, verify tests, and resolve issues."
        }

        registry = self._load_registry()
        # Replace existing or append
        registry = [r for r in registry if r["id"] != clean_name]
        registry.append(repo_entry)
        self._save_registry(registry)

        self.active_repo_id = clean_name
        return self.get_active_repo()

    def connect_local_repo(self, local_path: str, custom_name: Optional[str] = None) -> Dict[str, Any]:
        """Connects an existing directory on the machine as a real repository."""
        resolved = os.path.abspath(local_path.strip().strip("'\""))
        if not os.path.exists(resolved):
            raise FileNotFoundError(f"Directory does not exist: {resolved}")
        if not os.path.isdir(resolved):
            raise ValueError(f"Path is not a directory: {resolved}")

        folder_name = custom_name or os.path.basename(resolved)
        clean_id = "".join(c for c in folder_name if c.isalnum() or c in ("-", "_")).lower()
        if not clean_id:
            clean_id = f"local-{int(os.getpid())}"

        self._ensure_git_init(resolved, "Initialize local repo tracking")

        repo_entry = {
            "id": clean_id,
            "name": folder_name,
            "path": resolved,
            "source_type": "local",
            "description": f"Connected from {resolved}",
            "default_objective": "Analyze architecture, run test suite, and implement tasks."
        }

        registry = self._load_registry()
        registry = [r for r in registry if r["id"] != clean_id]
        registry.append(repo_entry)
        self._save_registry(registry)

        self.active_repo_id = clean_id
        return self.get_active_repo()

    def reset_repo(self, repo_id: str) -> bool:
        """Resets a starter repo to its pristine state with intentional bugs for testing."""
        if repo_id == "rbac-service":
            target = os.path.join(self.base_dir, "rbac-service")
            for fname, content in RBAC_FILES.items():
                with open(os.path.join(target, fname), "w", encoding="utf-8") as f:
                    f.write(content)
            return True
        elif repo_id == "session-cache-service":
            target = os.path.join(self.base_dir, "session-cache-service")
            for fname, content in CACHE_FILES.items():
                with open(os.path.join(target, fname), "w", encoding="utf-8") as f:
                    f.write(content)
            return True
        elif repo_id == "task-manager-api":
            target = os.path.join(self.base_dir, "task-manager-api")
            for fname, content in TASK_API_FILES.items():
                with open(os.path.join(target, fname), "w", encoding="utf-8") as f:
                    f.write(content)
            return True
        return False
