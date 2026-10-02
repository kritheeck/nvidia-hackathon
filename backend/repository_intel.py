"""
NEXUS Repository Intelligence Engine
Performs progressive context discovery, AST analysis, framework detection,
and symbol mapping without blindly dumping entire repositories into model context.

Large-repo hardening:
  - MAX_FILES: caps total file enumeration to prevent OOM on monorepos
  - MAX_AST_FILES: limits AST analysis to top source files only
  - MAX_TREE_FILES: caps file tree for frontend rendering
  - MAX_FILE_READ_BYTES: prevents loading huge files into memory
  - Per-file AST timeout via signal (Unix) or thread-based guard (Windows)
  - get_file_content() enforces byte limit + binary detection
"""
import os
import ast
import json
import time
import pathlib
import threading
from typing import Dict, Any, List, Optional

# ─── Safety Caps ─────────────────────────────────────────────────────────────
MAX_FILES         = 5_000   # Maximum files to enumerate per repo walk
MAX_AST_FILES     = 30      # Maximum Python files to AST-parse per analysis
MAX_TREE_FILES    = 2_000   # Maximum nodes returned in file tree
MAX_FILE_READ_BYTES = 512 * 1024  # 512 KB cap per file read
AST_PARSE_TIMEOUT = 3.0     # Seconds before abandoning an AST parse

_SKIP_DIRS = {
    '.git', '__pycache__', 'node_modules', '.venv', 'venv', 'env',
    'dist', 'build', '.next', '.cache', '.tox', 'coverage', '.mypy_cache',
    '.pytest_cache', 'htmlcov', 'eggs', '.eggs', 'site-packages',
}

_SKIP_EXTENSIONS = {
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp',
    '.mp4', '.avi', '.mov', '.mkv', '.mp3', '.wav', '.ogg',
    '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
    '.so', '.dll', '.exe', '.bin', '.whl', '.egg',
    '.pyc', '.pyo', '.pyd',
    '.lock',                     # lockfiles can be huge
    '.map',                      # sourcemaps
}


def _ast_parse_with_timeout(source: str, filename: str, timeout: float) -> Optional[ast.AST]:
    """Parses AST in a thread; returns None if it exceeds the timeout."""
    result: Dict[str, Any] = {}

    def _parse():
        try:
            result["tree"] = ast.parse(source, filename=filename)
        except Exception as exc:
            result["error"] = str(exc)

    t = threading.Thread(target=_parse, daemon=True)
    t.start()
    t.join(timeout=timeout)
    if t.is_alive():
        return None  # Timed out — skip this file
    return result.get("tree")


class RepositoryIntel:
    def __init__(self, repo_path: str):
        self.repo_path = os.path.abspath(repo_path)

    # ─── Main Analysis ───────────────────────────────────────────────────────

    def analyze(self) -> Dict[str, Any]:
        """
        Deep deterministic scan of repository structure, language, framework,
        entrypoints, and test configuration.
        Capped at MAX_FILES to handle monorepos without crashing.
        """
        if not os.path.exists(self.repo_path):
            return {"error": f"Path not found: {self.repo_path}"}

        files_list: List[str] = []
        python_files: List[str] = []
        has_tests = False
        test_files: List[str] = []
        framework = "Unknown"
        package_manager = "Unknown"
        build_command = "None"
        test_command = "pytest"
        truncated = False

        for root, dirs, files in os.walk(self.repo_path):
            # Prune directories in-place to skip heavy/irrelevant trees
            dirs[:] = sorted([d for d in dirs if d not in _SKIP_DIRS])

            for file in files:
                ext = pathlib.Path(file).suffix.lower()
                if ext in _SKIP_EXTENSIONS:
                    continue

                rel_path = os.path.relpath(
                    os.path.join(root, file), self.repo_path
                ).replace("\\", "/")

                files_list.append(rel_path)

                if file.endswith('.py'):
                    python_files.append(rel_path)
                    if 'test' in file.lower() or 'spec' in file.lower():
                        has_tests = True
                        test_files.append(rel_path)
                elif file in ('package.json', 'pnpm-lock.yaml', 'yarn.lock'):
                    if 'pnpm' in file:
                        package_manager = 'pnpm'
                    elif package_manager == 'Unknown':
                        package_manager = 'npm'
                elif file in ('requirements.txt', 'pyproject.toml', 'Pipfile', 'setup.py'):
                    package_manager = 'pip/poetry'
                elif file in ('go.mod',):
                    package_manager = 'go modules'
                elif file in ('Cargo.toml',):
                    package_manager = 'cargo'

                if len(files_list) >= MAX_FILES:
                    truncated = True
                    dirs.clear()   # Stop walking further subtrees
                    break

        # Framework heuristics
        lower_files = [f.lower() for f in files_list]
        if any('fastapi' in f or f.endswith('app.py') or f.endswith('main.py') for f in lower_files if f.endswith('.py')):
            framework = "FastAPI / Python Web API"
            build_command = "python -m py_compile"
            test_command = "pytest -v"
        elif any('flask' in f for f in lower_files):
            framework = "Flask"
            test_command = "pytest -v"
        elif any('django' in f for f in lower_files):
            framework = "Django"
            test_command = "pytest -v"
        elif package_manager in ('pnpm', 'npm'):
            framework = "Next.js / Node.js"
            test_command = "pnpm test"
        elif package_manager == 'go modules':
            framework = "Go"
            test_command = "go test ./..."
        elif package_manager == 'cargo':
            framework = "Rust"
            test_command = "cargo test"

        # AST symbols — cap to MAX_AST_FILES, skip huge files
        symbols = self._extract_ast_symbols(python_files[:MAX_AST_FILES])

        # Return a capped file list to avoid flooding the frontend
        display_files = sorted(files_list)[:MAX_TREE_FILES]

        return {
            "repo_path": self.repo_path,
            "project_name": os.path.basename(self.repo_path),
            "language": "Python" if python_files else "JavaScript/TypeScript",
            "framework": framework,
            "package_manager": package_manager,
            "build_command": build_command,
            "test_command": test_command,
            "total_files": len(files_list),
            "truncated": truncated,
            "files": display_files,
            "python_files": sorted(python_files)[:MAX_AST_FILES],
            "test_files": sorted(test_files),
            "symbols": symbols,
            "has_tests": has_tests,
        }

    # ─── AST Extraction ──────────────────────────────────────────────────────

    def _extract_ast_symbols(self, py_files: List[str]) -> Dict[str, Any]:
        symbols = {}
        for rel_path in py_files:
            full_path = os.path.join(self.repo_path, rel_path)
            try:
                stat = os.stat(full_path)
                if stat.st_size > MAX_FILE_READ_BYTES:
                    symbols[rel_path] = {"error": f"File too large for AST ({stat.st_size // 1024} KB)"}
                    continue

                with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                    source = f.read()

                tree = _ast_parse_with_timeout(source, rel_path, AST_PARSE_TIMEOUT)
                if tree is None:
                    symbols[rel_path] = {"error": "AST parse timed out"}
                    continue

                classes, functions, imports = [], [], []
                for node in ast.walk(tree):
                    if isinstance(node, ast.ClassDef):
                        classes.append(node.name)
                    elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        functions.append(node.name)
                    elif isinstance(node, ast.Import):
                        for alias in node.names:
                            imports.append(alias.name)
                    elif isinstance(node, ast.ImportFrom) and node.module:
                        imports.append(node.module)

                symbols[rel_path] = {
                    "classes": classes,
                    "functions": functions,
                    "dependencies": list(set(imports)),
                }
            except Exception as exc:
                symbols[rel_path] = {"error": f"AST parse failed: {exc}"}
        return symbols

    # ─── File Content ────────────────────────────────────────────────────────

    def get_file_content(self, rel_path: str) -> Optional[str]:
        """
        Returns text content of a file within the repo.
        - Path-traversal guarded
        - Hard capped at MAX_FILE_READ_BYTES
        - Returns None for binary / unreadable files
        """
        full_path = os.path.abspath(os.path.join(self.repo_path, rel_path))
        # Path traversal guard
        if not full_path.startswith(self.repo_path + os.sep) and full_path != self.repo_path:
            return None
        if not os.path.exists(full_path) or not os.path.isfile(full_path):
            return None

        stat = os.stat(full_path)
        if stat.st_size > MAX_FILE_READ_BYTES:
            return f"[NEXUS] File too large to display ({stat.st_size // 1024} KB). Only files ≤ 512 KB are shown."

        try:
            with open(full_path, 'r', encoding='utf-8', errors='strict') as f:
                return f.read(MAX_FILE_READ_BYTES)
        except UnicodeDecodeError:
            return None  # Binary file — not text-readable

    # ─── File Tree ───────────────────────────────────────────────────────────

    def build_tree_structure(self) -> Dict[str, Any]:
        """
        Returns hierarchical JSON tree for frontend visualization.
        Capped at MAX_TREE_FILES nodes to prevent browser DOM overload.
        """
        file_count = 0
        truncated = False

        def attach_node(root_dict: Dict, parts: List[str], is_file: bool):
            current = root_dict
            for i, part in enumerate(parts):
                if i == len(parts) - 1 and is_file:
                    current.setdefault("children", []).append({
                        "name": part,
                        "type": "file",
                        "path": "/".join(parts),
                    })
                else:
                    children = current.setdefault("children", [])
                    found = next(
                        (c for c in children if c["name"] == part and c["type"] == "directory"),
                        None,
                    )
                    if not found:
                        found = {
                            "name": part,
                            "type": "directory",
                            "path": "/".join(parts[: i + 1]),
                            "children": [],
                        }
                        children.append(found)
                    current = found

        tree: Dict[str, Any] = {
            "name": os.path.basename(self.repo_path),
            "type": "directory",
            "children": [],
        }

        for root, dirs, files in os.walk(self.repo_path):
            dirs[:] = sorted([d for d in dirs if d not in _SKIP_DIRS])
            rel_dir = os.path.relpath(root, self.repo_path)
            dir_parts: List[str] = [] if rel_dir == "." else rel_dir.replace("\\", "/").split("/")

            for file in sorted(files):
                ext = pathlib.Path(file).suffix.lower()
                if ext in _SKIP_EXTENSIONS:
                    continue
                if file_count >= MAX_TREE_FILES:
                    truncated = True
                    dirs.clear()
                    break
                parts = dir_parts + [file]
                attach_node(tree, parts, is_file=True)
                file_count += 1

        tree["truncated"] = truncated
        tree["total_files"] = file_count
        return tree
