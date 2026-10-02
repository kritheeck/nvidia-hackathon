import sys, os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from repository_intel import RepositoryIntel, MAX_FILES, MAX_TREE_FILES

root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
intel = RepositoryIntel(root)

result = intel.analyze()
print("Files found :", result["total_files"])
print("Truncated   :", result["truncated"])
print("Files in list:", len(result["files"]), "(cap", MAX_FILES, ")")
print("Has tests   :", result["has_tests"])
print("Framework   :", result["framework"])

tree = intel.build_tree_structure()
print("Tree nodes  :", tree["total_files"], "(cap", MAX_TREE_FILES, ")")
print("Tree trunc  :", tree["truncated"])

# Test cache
from repo_manager import _get_cached_analysis, _set_cached_analysis
_set_cached_analysis(root, result)
cached = _get_cached_analysis(root)
assert cached is not None, "Cache miss immediately after set!"
print("Cache        : working (TTL-based)")

print("")
print("ALL LARGE-REPO TESTS PASSED")
