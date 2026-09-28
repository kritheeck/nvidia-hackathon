"""
Workspace API Service
"""
from auth import authenticate_token, check_permission

class MockResponse:
    def __init__(self, status_code: int, data: dict):
        self.status_code = status_code
        self.data = data

def handle_request(path: str, token: str = None) -> MockResponse:
    if path == "/api/public":
        return MockResponse(200, {"status": "online", "access": "public"})

    user = authenticate_token(token)
    if not user:
        return MockResponse(401, {"error": "Unauthorized: Missing or invalid token"})

    if path == "/api/member-dashboard":
        if not check_permission(user, "member"):
            return MockResponse(403, {"error": "Forbidden: Requires member role"})
        return MockResponse(200, {"status": "ok", "user": user.username, "view": "member-dashboard"})

    if path == "/api/admin":
        if not check_permission(user, "admin"):
            return MockResponse(403, {"error": "Forbidden: Requires admin role"})
        return MockResponse(200, {"status": "ok", "user": user.username, "view": "admin-control"})

    return MockResponse(404, {"error": "Not Found"})
