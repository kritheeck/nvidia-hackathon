"""
NEXUS Repository Intelligence Engine
Performs progressive context discovery, AST analysis, framework detection,
and symbol mapping without blindly dumping entire repositories into model context.
"""
import os
import ast
import json
from typing import Dict, Any, List, Optional

class RepositoryIntel:
    def __init__(self, repo_path: str):
        self.repo_path = os.path.abspath(repo_path)

    def analyze(self) -> Dict[str, Any]:
        """
        Deep deterministic scan of repository structure, language, framework,
        entrypoints, and test configuration.
        """
        if not os.path.exists(self.repo_path):
            return {"error": f"Path not found: {self.repo_path}"}

        files_list = []
        python_files = []
        has_tests = False
        test_files = []
        framework = "Unknown"
        package_manager = "Unknown"
        build_command = "None"
        test_command = "pytest"

        for root, dirs, files in os.walk(self.repo_path):
            dirs[:] = [d for d in dirs if d not in ['.git', '__pycache__', 'node_modules', '.venv', 'venv', 'dist', 'build']]
            for file in files:
                rel_path = os.path.relpath(os.path.join(root, file), self.repo_path).replace("\\", "/")
                files_list.append(rel_path)

                if file.endswith('.py'):
                    python_files.append(rel_path)
                    if 'test' in file.lower():
                        has_tests = True
                        test_files.append(rel_path)
                elif file in ['package.json', 'pnpm-lock.yaml']:
                    package_manager = 'pnpm' if 'pnpm' in file else 'npm'
                elif file in ['requirements.txt', 'pyproject.toml', 'Pipfile']:
                    package_manager = 'pip/poetry'

        # Framework heuristics
        if any('fastapi' in f.lower() or 'app.py' in f or 'main.py' in f for f in python_files):
            framework = "FastAPI / Python Web API"
            build_command = "python -m py_compile"
            test_command = "pytest -v"
        elif any('flask' in f.lower() for f in python_files):
            framework = "Flask"
            test_command = "pytest -v"
        elif package_manager in ['pnpm', 'npm']:
            framework = "Next.js / Node.js"
            test_command = "pnpm test"

        # AST symbols for Python files
        symbols = self._extract_ast_symbols(python_files)

        return {
            "repo_path": self.repo_path,
            "project_name": os.path.basename(self.repo_path),
            "language": "Python" if python_files else "JavaScript/TypeScript",
            "framework": framework,
            "package_manager": package_manager,
            "build_command": build_command,
            "test_command": test_command,
            "total_files": len(files_list),
            "files": sorted(files_list),
            "python_files": sorted(python_files),
            "test_files": sorted(test_files),
            "symbols": symbols,
            "has_tests": has_tests
        }

    def _extract_ast_symbols(self, py_files: List[str]) -> Dict[str, Any]:
        symbols = {}
        for rel_path in py_files[:20]: # Limit to top 20 source files for performance
            full_path = os.path.join(self.repo_path, rel_path)
            try:
                with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                    tree = ast.parse(f.read(), filename=rel_path)
                
                classes = []
                functions = []
                imports = []

                for node in ast.walk(tree):
                    if isinstance(node, ast.ClassDef):
                        classes.append(node.name)
                    elif isinstance(node, ast.FunctionDef) or isinstance(node, ast.AsyncFunctionDef):
                        functions.append(node.name)
                    elif isinstance(node, ast.Import):
                        for name in node.names:
                            imports.append(name.name)
                    elif isinstance(node, ast.ImportFrom):
                        if node.module:
                            imports.append(node.module)

                symbols[rel_path] = {
                    "classes": classes,
                    "functions": functions,
                    "dependencies": list(set(imports))
                }
            except Exception:
                symbols[rel_path] = {"error": "AST parse failed"}
        return symbols

    def get_file_content(self, rel_path: str) -> Optional[str]:
        full_path = os.path.abspath(os.path.join(self.repo_path, rel_path))
        if not full_path.startswith(self.repo_path):
            return None
        if os.path.exists(full_path) and os.path.isfile(full_path):
            with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
        return None

    def build_tree_structure(self) -> Dict[str, Any]:
        """Returns hierarchical JSON tree for frontend visualization"""
        def attach_node(root_dict, parts, is_file):
            current = root_dict
            for i, part in enumerate(parts):
                if i == len(parts) - 1 and is_file:
                    current.setdefault("children", []).append({
                        "name": part,
                        "type": "file",
                        "path": "/".join(parts)
                    })
                else:
                    children = current.setdefault("children", [])
                    found = next((c for c in children if c["name"] == part and c["type"] == "directory"), None)
                    if not found:
                        found = {
                            "name": part,
                            "type": "directory",
                            "path": "/".join(parts[:i+1]),
                            "children": []
                        }
                        children.append(found)
                    current = found

        tree = {"name": os.path.basename(self.repo_path), "type": "directory", "children": []}
        for root, dirs, files in os.walk(self.repo_path):
            dirs[:] = [d for d in dirs if d not in ['.git', '__pycache__', 'node_modules', '.venv', 'dist']]
            rel_dir = os.path.relpath(root, self.repo_path)
            dir_parts = [] if rel_dir == "." else rel_dir.replace("\\", "/").split("/")
            for file in sorted(files):
                parts = dir_parts + [file]
                attach_node(tree, parts, is_file=True)
        return tree
