"""
NEXUS Controlled Execution Sandbox
Executes commands, tests, and builds in an isolated environment.
Collects actual stdout, stderr, exit codes, timings, and structured test results.
Never simulates output.
"""
import os
import sys
import time
import subprocess
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict

@dataclass
class ExecutionResult:
    command: str
    exit_code: int
    stdout: str
    stderr: str
    duration_ms: float
    passed: bool
    total_tests: int = 0
    passed_tests: int = 0
    failed_tests: int = 0
    error_summary: Optional[str] = None

class ExecutionEngine:
    def __init__(self, sandbox_path: str):
        self.sandbox_path = os.path.abspath(sandbox_path)

    def run_tests(self, test_cmd: Optional[str] = None, timeout_sec: int = 30) -> ExecutionResult:
        """
        Executes real test suite inside the sandboxed repository.
        Parses actual pytest or test runner output.
        """
        if not test_cmd:
            test_cmd = f"{sys.executable} -m pytest -v"
        
        start_time = time.time()
        
        # Clean environment to prevent secret leakage into untrusted code
        env = os.environ.copy()
        for secret_key in ['NVIDIA_API_KEY', 'NEBIUS_API_KEY', 'OPENAI_API_KEY', 'GITHUB_TOKEN']:
            env.pop(secret_key, None)

        try:
            proc = subprocess.run(
                test_cmd,
                shell=True,
                cwd=self.sandbox_path,
                capture_output=True,
                text=True,
                timeout=timeout_sec,
                env=env
            )
            duration_ms = round((time.time() - start_time) * 1000, 2)
            stdout = proc.stdout
            stderr = proc.stderr
            exit_code = proc.returncode

            total, passed, failed, error_summary = self._parse_pytest_output(stdout, stderr)

            return ExecutionResult(
                command=test_cmd,
                exit_code=exit_code,
                stdout=stdout,
                stderr=stderr,
                duration_ms=duration_ms,
                passed=(exit_code == 0),
                total_tests=total,
                passed_tests=passed,
                failed_tests=failed,
                error_summary=error_summary
            )

        except subprocess.TimeoutExpired:
            duration_ms = round((time.time() - start_time) * 1000, 2)
            return ExecutionResult(
                command=test_cmd,
                exit_code=-1,
                stdout="",
                stderr=f"Execution timed out after {timeout_sec}s.",
                duration_ms=duration_ms,
                passed=False,
                error_summary="TimeoutExpired"
            )
        except Exception as e:
            duration_ms = round((time.time() - start_time) * 1000, 2)
            return ExecutionResult(
                command=test_cmd,
                exit_code=-1,
                stdout="",
                stderr=str(e),
                duration_ms=duration_ms,
                passed=False,
                error_summary=str(e)
            )

    def _parse_pytest_output(self, stdout: str, stderr: str):
        total = 0
        passed = 0
        failed = 0
        error_summary = None

        lines = stdout.splitlines()
        for line in reversed(lines):
            line_str = line.strip()
            # Example pytest output: "====== 1 failed, 5 passed in 0.12s ======"
            # Or: "====== 6 passed in 0.08s ======"
            if "passed" in line_str or "failed" in line_str or "error" in line_str:
                import re
                p_match = re.search(r'(\d+)\s+passed', line_str)
                f_match = re.search(r'(\d+)\s+failed', line_str)
                e_match = re.search(r'(\d+)\s+error', line_str)

                if p_match:
                    passed = int(p_match.group(1))
                if f_match:
                    failed = int(f_match.group(1))
                if e_match:
                    failed += int(e_match.group(1))
                
                total = passed + failed
                if total > 0:
                    break

        # Extract failure trace if failed
        if failed > 0:
            fail_blocks = []
            capture = False
            for line in lines:
                if line.startswith("FAILED ") or line.startswith("FAILURES"):
                    capture = True
                if capture:
                    fail_blocks.append(line)
                    if len(fail_blocks) > 25:
                        break
            if fail_blocks:
                error_summary = "\n".join(fail_blocks[:20])
            else:
                error_summary = f"{failed} test assertions failed"

        return total, passed, failed, error_summary
