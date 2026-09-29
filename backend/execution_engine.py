"""
NEXUS Controlled Execution Sandbox
Executes commands, tests, and builds in an isolated environment.
Collects actual stdout, stderr, exit codes, timings, and structured test results.
Security: shell=False, command allowlist, secret scrubbing, process isolation.
Never simulates output.
"""
import os
import sys
import time
import signal
import subprocess
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict

from security import validate_command, scrub_secrets


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

    def run_tests(
        self, test_cmd: Optional[str] = None, timeout_sec: int = 60
    ) -> ExecutionResult:
        """
        Executes real test suite inside the sandboxed repository.
        Uses shell=False with strict command allowlist to prevent injection.
        """
        # Build safe command list
        if not test_cmd:
            safe_cmd = [sys.executable, "-m", "pytest", "-v"]
            canonical = "python -m pytest -v"
        else:
            try:
                safe_cmd, canonical = validate_command(test_cmd)
            except (ValueError, PermissionError) as e:
                return ExecutionResult(
                    command=test_cmd,
                    exit_code=-1,
                    stdout="",
                    stderr=f"[NEXUS SECURITY] Command blocked: {e}",
                    duration_ms=0.0,
                    passed=False,
                    error_summary="CommandBlocked",
                )

        # Strip secrets from subprocess environment
        env = scrub_secrets(os.environ.copy())

        start_time = time.time()
        proc = None

        try:
            proc = subprocess.Popen(
                safe_cmd,
                shell=False,              # Never True — prevents injection
                cwd=self.sandbox_path,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env=env,
                # Isolate process group so we can kill the entire tree on timeout
                creationflags=(
                    subprocess.CREATE_NEW_PROCESS_GROUP
                    if sys.platform == "win32"
                    else 0
                ),
                start_new_session=(sys.platform != "win32"),
            )

            try:
                stdout, stderr = proc.communicate(timeout=timeout_sec)
            except subprocess.TimeoutExpired:
                # Kill entire process group
                if sys.platform == "win32":
                    proc.kill()
                else:
                    try:
                        os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
                    except Exception:
                        proc.kill()
                proc.wait(timeout=5)
                duration_ms = round((time.time() - start_time) * 1000, 2)
                return ExecutionResult(
                    command=canonical,
                    exit_code=-1,
                    stdout="",
                    stderr=f"Execution timed out after {timeout_sec}s.",
                    duration_ms=duration_ms,
                    passed=False,
                    error_summary="TimeoutExpired",
                )

            duration_ms = round((time.time() - start_time) * 1000, 2)
            exit_code = proc.returncode

            total, passed_count, failed_count, error_summary = (
                self._parse_pytest_output(stdout, stderr)
            )

            return ExecutionResult(
                command=canonical,
                exit_code=exit_code,
                stdout=stdout,
                stderr=stderr,
                duration_ms=duration_ms,
                passed=(exit_code == 0),
                total_tests=total,
                passed_tests=passed_count,
                failed_tests=failed_count,
                error_summary=error_summary,
            )

        except Exception as e:
            duration_ms = round((time.time() - start_time) * 1000, 2)
            return ExecutionResult(
                command=canonical,
                exit_code=-1,
                stdout="",
                stderr=str(e),
                duration_ms=duration_ms,
                passed=False,
                error_summary=str(e),
            )

    def _parse_pytest_output(self, stdout: str, stderr: str):
        total = 0
        passed = 0
        failed = 0
        error_summary = None

        lines = stdout.splitlines()
        for line in reversed(lines):
            line_str = line.strip()
            if "passed" in line_str or "failed" in line_str or "error" in line_str:
                import re
                p_match = re.search(r"(\d+)\s+passed", line_str)
                f_match = re.search(r"(\d+)\s+failed", line_str)
                e_match = re.search(r"(\d+)\s+error", line_str)

                if p_match:
                    passed = int(p_match.group(1))
                if f_match:
                    failed = int(f_match.group(1))
                if e_match:
                    failed += int(e_match.group(1))

                total = passed + failed
                if total > 0:
                    break

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
