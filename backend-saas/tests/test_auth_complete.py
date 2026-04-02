"""
test_auth_complete.py — Comprehensive E2E tests for authentication endpoints.

Tests cover:
- User registration with various roles
- Duplicate email prevention
- Inactive user login prevention
- Successful login with API key generation
- User profile retrieval
- Admin-only operations
"""
import pytest
from fastapi.testclient import TestClient


class TestAuthRegister:
    """Test user registration endpoints."""

    def test_register_cliente_with_tenant_id(self, client: TestClient):
        """Test registering a cliente user with a tenant_id."""
        response = client.post(
            "/auth/register",
            json={
                "email": "newcliente@test.example.com",
                "password": "SecurePass123!",
                "nombre": "New Cliente",
                "rol": "cliente",
                "tenant_id": "test-tenant-xyz",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "newcliente@test.example.com"
        assert data["rol"] == "cliente"
        assert data["tenant_id"] == "test-tenant-xyz"
        assert data["status"] == "pendiente"  # Newly registered users are pending/inactive

    def test_register_analista_without_tenant_id(self, client: TestClient):
        """Test registering an analista user (should not have tenant_id)."""
        response = client.post(
            "/auth/register",
            json={
                "email": "newanalista@test.example.com",
                "password": "SecurePass123!",
                "nombre": "New Analista",
                "rol": "analista",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "newanalista@test.example.com"
        assert data["rol"] == "analista"
        assert data.get("tenant_id") is None
        assert data["status"] == "pendiente"

    def test_register_duplicate_email_fails(self, client: TestClient, test_admin_user):
        """Test that registering with duplicate email returns 409."""
        # test_admin_user already exists with email "admin@test.example.com"
        response = client.post(
            "/auth/register",
            json={
                "email": "admin@test.example.com",
                "password": "AnotherPassword123!",
                "nombre": "Duplicate Admin",
                "rol": "admin",
            },
        )

        assert response.status_code == 409
        # Message may be in Spanish or English
        detail = response.json()["detail"].lower()
        assert any(word in detail for word in ["already", "duplicate", "registrado", "ya existe"])

    def test_register_with_invalid_email_format(self, client: TestClient):
        """Test that invalid email format is rejected."""
        response = client.post(
            "/auth/register",
            json={
                "email": "not-an-email",
                "password": "SecurePass123!",
                "nombre": "Invalid Email User",
                "rol": "cliente",
                "tenant_id": "test-tenant-001",
            },
        )

        assert response.status_code == 422  # Validation error


class TestAuthLogin:
    """Test user login endpoints."""

    def test_login_inactive_user_fails(self, client: TestClient, db_connection):
        """Test that login with inactive user returns 403."""
        # Create an inactive user
        from app.auth_service import create_user

        create_user(
            email="inactive@test.example.com",
            password="InactivePass123!",
            nombre="Inactive User",
            rol="cliente",
            tenant_id="test-tenant-001",
            activo=False,
        )

        response = client.post(
            "/auth/login",
            json={
                "email": "inactive@test.example.com",
                "password": "InactivePass123!",
            },
        )

        assert response.status_code == 403
        assert "inactive" in response.json()["detail"].lower()

    def test_login_with_wrong_password_fails(self, client: TestClient, test_admin_user):
        """Test that login with wrong password fails."""
        response = client.post(
            "/auth/login",
            json={
                "email": "admin@test.example.com",
                "password": "WrongPassword123!",
            },
        )

        assert response.status_code == 401

    def test_login_nonexistent_user_fails(self, client: TestClient):
        """Test that login with nonexistent user fails."""
        response = client.post(
            "/auth/login",
            json={
                "email": "nonexistent@test.example.com",
                "password": "SomePassword123!",
            },
        )

        assert response.status_code in [401, 404]  # Either 401 or 404 for user not found

    def test_login_success_returns_api_key(self, client: TestClient, test_admin_user):
        """Test successful login returns API key and user data."""
        response = client.post(
            "/auth/login",
            json={
                "email": "admin@test.example.com",
                "password": "AdminPassword123!",
            },
        )

        assert response.status_code == 200
        data = response.json()

        # Verify API key format
        assert "api_key" in data
        assert data["api_key"].startswith("wh_")

        # Verify user data
        assert data["email"] == "admin@test.example.com"
        assert data["nombre"] == "Test Admin"
        assert data["rol"] == "admin"
        assert "mensaje" in data

    def test_login_cliente_returns_tenant_id(self, client: TestClient, test_cliente_user):
        """Test that cliente login includes tenant_id."""
        response = client.post(
            "/auth/login",
            json={
                "email": "cliente@test.example.com",
                "password": "ClientePassword123!",
            },
        )

        assert response.status_code == 200
        data = response.json()

        assert data["email"] == "cliente@test.example.com"
        assert data["tenant_id"] == "test-tenant-001"
        assert data["rol"] == "cliente"


class TestAuthUserProfile:
    """Test user profile endpoints."""

    def test_get_profile_with_valid_api_key(self, client: TestClient, test_admin_user):
        """Test retrieving profile with valid API key."""
        # First, login to get API key
        login_response = client.post(
            "/auth/login",
            json={
                "email": "admin@test.example.com",
                "password": "AdminPassword123!",
            },
        )

        api_key = login_response.json()["api_key"]

        # Now use API key to get profile
        response = client.get(
            "/auth/me",
            headers={"X-API-Key": api_key},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "admin@test.example.com"
        assert data["nombre"] == "Test Admin"
        assert data["rol"] == "admin"

    def test_get_profile_without_api_key_fails(self, client: TestClient):
        """Test that accessing profile without API key fails."""
        response = client.get("/auth/me")

        assert response.status_code == 401
        assert "API Key" in response.json()["detail"] or "required" in response.json()["detail"].lower()

    def test_get_profile_with_invalid_api_key_fails(self, client: TestClient):
        """Test that invalid API key is rejected."""
        response = client.get(
            "/auth/me",
            headers={"X-API-Key": "wh_invalid_key_123"},
        )

        assert response.status_code == 401
        # Message may be in Spanish or English
        detail = response.json()["detail"].lower()
        assert any(word in detail for word in ["invalid", "invalida", "inactivo"])

    def test_get_profile_cliente_includes_tenant(self, client: TestClient, test_cliente_user):
        """Test that cliente profile includes tenant data."""
        login_response = client.post(
            "/auth/login",
            json={
                "email": "cliente@test.example.com",
                "password": "ClientePassword123!",
            },
        )

        api_key = login_response.json()["api_key"]

        response = client.get(
            "/auth/me",
            headers={"X-API-Key": api_key},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["tenant_id"] == "test-tenant-001"


class TestAuthListUsers:
    """Test user listing endpoints (admin only)."""

    def test_list_users_as_admin(self, client: TestClient, test_admin_user, test_analista_user):
        """Test that admin can list all users."""
        login_response = client.post(
            "/auth/login",
            json={
                "email": "admin@test.example.com",
                "password": "AdminPassword123!",
            },
        )

        api_key = login_response.json()["api_key"]

        response = client.get(
            "/auth/users",
            headers={"X-API-Key": api_key},
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have at least our test admin and analista
        assert len(data) >= 2

    def test_list_users_as_analista_fails(self, client: TestClient, test_analista_user):
        """Test that non-admin users cannot list all users."""
        login_response = client.post(
            "/auth/login",
            json={
                "email": "analista@test.example.com",
                "password": "AnalistaPassword123!",
            },
        )

        api_key = login_response.json()["api_key"]

        response = client.get(
            "/auth/users",
            headers={"X-API-Key": api_key},
        )

        assert response.status_code == 403
        assert "admin" in response.json()["detail"].lower()

    def test_list_users_without_auth_fails(self, client: TestClient):
        """Test that unauthenticated request to list users fails."""
        response = client.get("/auth/users")

        assert response.status_code == 401


class TestAuthActivateUser:
    """Test user activation endpoints (admin only)."""

    def test_activate_user_as_admin(self, client: TestClient, test_admin_user, db_connection):
        """Test that admin can activate an inactive user."""
        from app.auth_service import create_user

        # Create an inactive user
        inactive_user = create_user(
            email="tobe_activated@test.example.com",
            password="ToActivatePass123!",
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

        # Activate the user
        response = client.post(
            "/auth/activate",
            json={
                "user_id": inactive_user["id"],
                "activo": True,
            },
            headers={"X-API-Key": api_key},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["user"]["activo"] is True

        # Verify user can now login
        login_response2 = client.post(
            "/auth/login",
            json={
                "email": "tobe_activated@test.example.com",
                "password": "ToActivatePass123!",
            },
        )

        assert login_response2.status_code == 200

    def test_activate_user_as_non_admin_fails(self, client: TestClient, test_analista_user, db_connection):
        """Test that non-admin cannot activate users."""
        from app.auth_service import create_user

        # Create an inactive user
        inactive_user = create_user(
            email="tobe_activated2@test.example.com",
            password="ToActivatePass123!",
            nombre="To Activate 2",
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
                "user_id": inactive_user["id"],
                "activo": True,
            },
            headers={"X-API-Key": api_key},
        )

        assert response.status_code == 403
        assert "admin" in response.json()["detail"].lower()


class TestHealthCheck:
    """Test health check endpoint."""

    def test_health_check_without_auth(self, client: TestClient):
        """Test that health check endpoint is accessible without authentication."""
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "service" in data
