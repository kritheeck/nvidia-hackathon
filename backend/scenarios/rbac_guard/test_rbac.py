"""
Comprehensive RBAC Test Suite
Tests authentication, authorization, role hierarchy, and regression boundaries.
"""
import pytest
from app import handle_request

def test_public_endpoint():
    res = handle_request("/api/public")
    assert res.status_code == 200
    assert res.data["access"] == "public"

def test_unauthenticated_request_fails():
    res = handle_request("/api/admin", token=None)
    assert res.status_code == 401

def test_member_access():
    res = handle_request("/api/member-dashboard", token="member-token-abc")
    assert res.status_code == 200
    assert res.data["view"] == "member-dashboard"

def test_member_denied_admin():
    res = handle_request("/api/admin", token="member-token-abc")
    assert res.status_code == 403

def test_admin_access():
    res = handle_request("/api/admin", token="admin-token-xyz")
    assert res.status_code == 200
    assert res.data["view"] == "admin-control"

def test_admin_inherits_member_permission():
    """
    CRITICAL REGRESSION TEST:
    Admins must inherit member permissions to access member dashboards.
    """
    res = handle_request("/api/member-dashboard", token="admin-token-xyz")
    assert res.status_code == 200
    assert res.data["user"] == "superadmin"

def test_guest_forbidden():
    res = handle_request("/api/member-dashboard", token="guest-token-123")
    assert res.status_code == 403
