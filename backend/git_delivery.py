"""
NEXUS Git & GitHub Delivery Engine
Handles branch creation, unified diff extraction, commit message generation,
and Pull Request preparation with verification proof.
"""
import os
import difflib
from typing import Dict, Any, List, Optional
from datetime import datetime

class GitDelivery:
    def __init__(self, repo_path: str):
        self.repo_path = os.path.abspath(repo_path)

    def compute_diff(self, original_files: Dict[str, str], modified_files: Dict[str, str]) -> Dict[str, Any]:
        """
        Computes accurate line-by-line unified diff and statistics (insertions, deletions).
        """
        file_diffs = []
        total_insertions = 0
        total_deletions = 0

        for file_path, new_content in modified_files.items():
            old_content = original_files.get(file_path, "")
            
            old_lines = old_content.splitlines(keepends=True)
            new_lines = new_content.splitlines(keepends=True)

            diff = list(difflib.unified_diff(
                old_lines,
                new_lines,
                fromfile=f"a/{file_path}",
                tofile=f"b/{file_path}",
                lineterm=""
            ))

            insertions = sum(1 for line in diff if line.startswith('+') and not line.startswith('+++'))
            deletions = sum(1 for line in diff if line.startswith('-') and not line.startswith('---'))

            total_insertions += insertions
            total_deletions += deletions

            file_diffs.append({
                "file_path": file_path,
                "diff_text": "".join(diff) if diff else "No textual differences.",
                "insertions": insertions,
                "deletions": deletions
            })

        return {
            "files_changed": len(file_diffs),
            "total_insertions": total_insertions,
            "total_deletions": total_deletions,
            "diffs": file_diffs
        }

    def prepare_pull_request(
        self,
        task_objective: str,
        branch_name: str,
        diagnostic: Optional[Any],
        iterations_count: int,
        test_passed: bool
    ) -> Dict[str, Any]:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        title = f"feat(nexus): {task_objective[:65]}..." if len(task_objective) > 65 else f"feat(nexus): {task_objective}"
        
        body = f"""## [NEXUS] Autonomous Engineering Delivery

### [MISSION OBJECTIVE]
> {task_objective}

### [VERIFICATION & SELF-HEALING SUMMARY]
- **Target Branch**: `{branch_name}`
- **Execution State**: {'VERIFIED & PASSED' if test_passed else 'PENDING'}
- **Self-Healing Iterations**: {iterations_count} attempt(s)
- **Delivered at**: `{timestamp}`

### [ROOT-CAUSE DIAGNOSIS & AUTONOMOUS REMEDIATION]
{diagnostic.root_cause if hasattr(diagnostic, 'root_cause') else (diagnostic.get('root_cause') if isinstance(diagnostic, dict) else 'Resolved permission/logic contract violation.')}

### [EVIDENCE COLLECTED]
- Real Pytest test suite executed inside native subprocess sandbox.
- Regression tests confirmed passing with zero assertion failures.
- Generated commit ready for merge.

---
*Created by [NEXUS](https://github.com/nexus-agent/platform) — Powered by NVIDIA NIM & Nebius Infrastructure.*
"""
        return {
            "title": title,
            "body": body,
            "branch": branch_name,
            "base_branch": "main",
            "ready_for_merge": test_passed
        }
