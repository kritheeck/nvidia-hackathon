"""
NEXUS Security Module
Centralized path validation, command allowlisting, and input sanitization.
Prevents path traversal, command injection, and unauthorized file access.
"""
import os
import sys
import pathlib
import shlex
from typing import List, Optional, Tuple

# ─── Command Allowlist ────────────────────────────────────────────────────────

ALLOWED_COMMAND_MAP = {
    "pytest": [sys.executable, "-m", "pytest"],
    "python":  [sys.executable],
    "-m":      [sys.executable, "-m"],
}

# Absolute blocklist — these can never run in the sandbox
BLOCKED_SUBSTRINGS = [
    "rm ", "del ", "rmdir", "format", "mkfs",
    "curl ", "wget ", "nc ", "ncat ", "netcat",
    "ssh ", "scp ", "ftp ", "sftp",
    ";", "&&", "||", "|", ">", "<", "`",
    "$(", "${", "eval ", "exec ",
]


def validate_command(test_cmd: str) -> Tuple[List[str], str]:
    """
    Validates a command string against the allowlist and returns a safe
    tokenized array suitable for subprocess.run(shell=False).

    Returns:
        (safe_cmd_list, canonical_command_string)

    Raises:
        PermissionError: If command is not on allowlist or contains blocked patterns.
        ValueError: If command is empty or malformed.
    """
    if not test_cmd or not test_cmd.strip():
        raise ValueError("Empty command string")

    cmd_lower = test_cmd.lower()
    for blocked in BLOCKED_SUBSTRINGS:
        if blocked in cmd_lower:
            raise PermissionError(
                f"Command contains blocked pattern '{blocked}': {test_cmd!r}"
            )

    try:
        parts = shlex.split(test_cmd)
    except ValueError as e:
        raise ValueError(f"Malformed command (could not tokenize): {e}")

    if not parts:
        raise ValueError("Command tokenized to empty list")

    base = parts[0]

    # Allow `python -m pytest` style
    if base in (sys.executable, "python", "python3"):
        safe = [sys.executable] + parts[1:]
        return safe, " ".join(safe)

    if base == "pytest":
        safe = [sys.executable, "-m", "pytest"] + parts[1:]
        return safe, " ".join(safe)

    raise PermissionError(
        f"Command '{base}' is not on the NEXUS allowlist. "
        f"Allowed base commands: pytest, python"
    )


# ─── Path Traversal Guard ─────────────────────────────────────────────────────

def validate_repo_path(base_repo: str, user_path: str) -> pathlib.Path:
    """
    Resolves `user_path` relative to `base_repo` and verifies it does not
    escape the repo root (path traversal protection).

    Returns:
        Absolute, safe pathlib.Path

    Raises:
        PermissionError: If path escapes the repository root.
        FileNotFoundError: If the resolved path does not exist.
        ValueError: If the path is not a regular file.
    """
    base = pathlib.Path(base_repo).resolve()
    requested = (base / user_path).resolve()

    # Must stay inside repo
    try:
        requested.relative_to(base)
    except ValueError:
        raise PermissionError(
            f"Path traversal detected. '{user_path}' resolves outside repo root."
        )

    if not requested.exists():
        raise FileNotFoundError(f"File not found: {user_path}")

    if not requested.is_file():
        raise ValueError(f"Path is not a regular file: {user_path}")

    return requested


def scrub_secrets(env: dict) -> dict:
    """
    Returns a copy of the environment dict with known secret keys removed.
    Prevents accidental leakage into subprocess environments.
    """
    SECRET_KEYS = {
        "NVIDIA_API_KEY", "NEBIUS_API_KEY",
        "OPENAI_API_KEY", "ANTHROPIC_API_KEY",
        "GITHUB_TOKEN", "GH_TOKEN",
        "AWS_SECRET_ACCESS_KEY", "AWS_ACCESS_KEY_ID",
        "DATABASE_URL", "SECRET_KEY",
    }
    return {k: v for k, v in env.items() if k not in SECRET_KEYS}
