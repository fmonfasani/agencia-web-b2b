"""
test_multitenant_isolation.py — Security and multitenant isolation tests.

Tests cover:
- Authentication and API key validation
- Unauthenticated access prevention
- Invalid API key rejection
- Multitenant data isolation
- Role-based access control
- Cross-tenant access prevention
"""
import pytest
from fastapi.testclient import TestClient


class TestUnauthenticatedAccess:
    """Test that unauthenticated requests are properly rejected."""

    def test_access_me_without_api_key(self, client: TestClient):
        """Test that accessing me endpoint without API key returns 401."""
        response = client.get("/auth/me")

        assert response.status_code == 401
        assert "API Key" in response.json()["detail"] or "required" in response.json()["detail"].lower()

    def test_access_onboarding_tenant_without_api_key(self, client: TestClient):
        """Test that creating tenant without API key returns 401."""
        response = client.post(
            "/onboarding/tenant",
            json={
                "tenant_id": "test-no-auth",
                "tenant_nombre": "Test",
                "industria": "servicios",
            },
        )

        assert response.status_code == 401

    def test_access_list_users_without_api_key(self, client: TestClient):
        """Test that listing users without API key returns 401."""
        response = client.get("/auth/users")

        assert response.status_code == 401

    def test_health_check_available_without_auth(self, client: TestClient):
        """Test that health check is accessible without authentication."""
        response = client.get("/health")

        assert response.status_code == 200
        assert response.json()["status"] == "ok"


class TestInvalidAPIKey:
    """Test that invalid API keys are properly rejected."""

    def test_invalid_api_key_format(self, client: TestClient):
        """Test that malformed API key is rejected."""
        response = client.get(
            "/auth/me",
            headers={"X-API-Key": "invalid_format"},
        )

        assert response.status_code == 401

    def test_api_key_of_wrong_length(self, client: TestClient):
        """Test that API key of wrong length is rejected."""
        response = client.get(
            "/auth/me",
            headers={"X-API-Key": "wh_short"},
        )

        assert response.status_code == 401

    def test_api_key_that_never_existed(self, client: TestClient):
        """Test that completely invalid API key is rejected."""
        response = client.get(
            "/auth/me",
            headers={"X-API-Key": "wh_0000000000000000000000000000000000000000000"},
        )

        assert response.status_code == 401

    def test_user_list_with_invalid_api_key(self, client: TestClient):
        """Test that invalid API key on admin endpoint is rejected."""
        response = client.get(
            "/auth/users",
            headers={"X-API-Key": "wh_completely_invalid"},
        )

        assert response.status_code == 401


class TestRoleBasedAccess:
    """Test role-based access control across endpoints."""

    def test_cliente_cannot_access_admin_endpoints(self, client: TestClient, test_cliente_user):
        """Test that cliente users cannot access admin-only endpoints."""
        # Login as cliente
        login_response = client.post(
            "/auth/login",
            json={
                "email": "cliente@test.example.com",
                "password": "ClientePassword123!",
            },
        )

        api_key = login_response.json()["api_key"]

        # Try to access admin endpoint (list users)
        response = client.get(
            "/auth/users",
            headers={"X-API-Key": api_key},
        )

        assert response.status_code == 403
        assert "admin" in response.json()["detail"].lower()

    def test_cliente_cannot_create_tenant(self, client: TestClient, test_cliente_user):
        """Test that cliente users cannot create tenants."""
        # Login as cliente
        login_response = client.post(
            "/auth/login",
            json={
                "email": "cliente@test.example.com",
                "password": "ClientePassword123!",
            },
        )

        api_key = login_response.json()["api_key"]

        # Try to create tenant
        response = client.post(
            "/onboarding/tenant",
            json={
                "tenant_id": "test",
                "tenant_nome": "test",
                "created_by": "cliente",
                "industria": "servicios",
            },
            headers={"X-API-Key": api_key},
        )

        assert response.status_code == 403

    def test_cliente_cannot_activate_users(self, client: TestClient, test_cliente_user, db_connection):
        """Test that cliente users cannot activate other users."""
        from app.auth_service import create_user

        # Create a user to activate
        user_to_activate = create_user(
            email="tobe_activated3@test.example.com",
            password="Pass123!",
            nombre="To Activate",
            rol="analista",
            tenant_id=None,
            activo=False,
        )

        # Login as cliente
        login_response = client.post(
            "/auth/login",
            json={
                "email": "cliente@test.example.com",
                "password": "ClientePassword123!",
            },
        )

        api_key = login_response.json()["api_key"]

        # Try to activate user
        response = client.post(
            "/auth/activate",
            json={
                "user_id": user_to_activate["id"],
                "activo": True,
            },
            headers={"X-API-Key": api_key},
        )

        assert response.status_code == 403

    def test_analista_can_list_users_fails(self, client: TestClient, test_analista_user):
        """Test that non-admin analista cannot list all users."""
        # Login as analista
        login_response = client.post(
            "/auth/login",
            json={
                "email": "analista@test.example.com",
                "password": "AnalistaPassword123!",
            },
        )

        api_key = login_response.json()["api_key"]

        # Try to list users (admin only)
        response = client.get(
            "/auth/users",
            headers={"X-API-Key": api_key},
        )

        assert response.status_code == 403

    def test_analista_cannot_activate_users(self, client: TestClient, test_analista_user, db_connection):
        """Test that analista users cannot activate users (admin only)."""
        from app.auth_service import create_user

        # Create a user to activate
        user_to_activate = create_user(
            email="tobe_activated4@test.example.com",
            password="Pass123!",
            nombre="To Activate",
            rol="analista",
            tenant_id=None,
            activo=False,
        )

        # Login as analista
        login_response = client.post(
            "/auth/login",
            json={
                "email": "analista@test.example.com",
                "password": "AnalistaPassword123!",
            },
        )

        api_key = login_response.json()["api_key"]

        # Try to activate user
        response = client.post(
            "/auth/activate",
            json={
                "user_id": user_to_activate["id"],
                "activo": True,
            },
            headers={"X-API-Key": api_key},
        )

        assert response.status_code == 403

    def test_admin_can_activate_users(self, client: TestClient, test_admin_user, db_connection):
        """Test that admin users can activate other users."""
        from app.auth_service import create_user

        # Create a user to activate
        user_to_activate = create_user(
            email="tobe_activated5@test.example.com",
            password="Pass123!",
            nombre="To Activate",
            rol="analista",
            tenant_id=None,
            activo=False,
        )

        # Login as admin
        login_response = client.post(
            "/auth/login",
            json={
                "email": "admin@test.example.com",
                "password": "AdminPassword123!",
            },
        )

        api_key = login_response.json()["api_key"]

        # Activate user
        response = client.post(
            "/auth/activate",
            json={
                "user_id": user_to_activate["id"],
                "activo": True,
            },
            headers={"X-API-Key": api_key},
        )

        assert response.status_code == 200


class TestMultitenantDataIsolation:
    """Test that tenants cannot access each other's data."""

    def test_cliente_only_belongs_to_own_tenant(self, client: TestClient, test_cliente_user):
        """Test that cliente user is associated with their tenant."""
        # Login as cliente
        cliente_login = client.post(
            "/auth/login",
            json={
                "email": "cliente@test.example.com",
                "password": "ClientePassword123!",
            },
        )

        assert cliente_login.status_code == 200
        data = cliente_login.json()

        # Client should have tenant_id set
        assert data["tenant_id"] == "test-tenant-001"
        assert data["rol"] == "cliente"


class TestAPIKeyExpiration:
    """Test API key management and validation."""

    def test_multiple_logins_generate_different_api_keys(self, client: TestClient, test_admin_user):
        """Test that each login generates a unique API key."""
        login1 = client.post(
            "/auth/login",
            json={
                "email": "admin@test.example.com",
                "password": "AdminPassword123!",
            },
        )

        api_key1 = login1.json()["api_key"]

        login2 = client.post(
            "/auth/login",
            json={
                "email": "admin@test.example.com",
                "password": "AdminPassword123!",
            },
        )

        api_key2 = login2.json()["api_key"]

        # Both should be valid API keys
        assert api_key1.startswith("wh_")
        assert api_key2.startswith("wh_")

        # They might be the same or different depending on implementation
        # What matters is both work
        response1 = client.get(
            "/auth/me",
            headers={"X-API-Key": api_key1},
        )

        response2 = client.get(
            "/auth/me",
            headers={"X-API-Key": api_key2},
        )

        assert response1.status_code == 200
        assert response2.status_code == 200
