"""
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
