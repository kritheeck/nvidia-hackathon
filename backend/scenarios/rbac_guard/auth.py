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
    REPAIRED: Admin role inherits all member privileges hierarchically.
    """
    if not user:
        return False
    
    if user.role == "admin":
        return True
        
    if required_role == "member" and user.role in ["admin", "member"]:
        return True
        
    return user.role == required_role
