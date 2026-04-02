"""
test_onboarding_complete.py — E2E tests for onboarding endpoints.

Tests cover:
- Getting onboarding status for a tenant
- Authorization checks for onboarding endpoints
"""
import pytest
from fastapi.testclient import TestClient


class TestOnboardingStatus:
    """Test onboarding status endpoints."""

    def test_get_onboarding_status_for_any_tenant(self, client: TestClient):
        """Test retrieving onboarding status for any tenant.

        Note: The status endpoint doesn't require auth and returns 200
        even for tenants that don't exist, with gaps filled in.
        """
        status_response = client.get(
            "/onboarding/status/test-tenant-status",
        )

        assert status_response.status_code == 200
        data = status_response.json()
        assert data["tenant_id"] == "test-tenant-status"
        assert "status" in data
        assert "gaps" in data  # Should indicate missing data

    def test_get_onboarding_status_nonexistent_tenant(self, client: TestClient):
        """Test getting status for a nonexistent tenant."""
        response = client.get(
            "/onboarding/status/completely-nonexistent-xyz",
        )

        # Status endpoint returns 200 even for nonexistent tenants
        assert response.status_code == 200
        data = response.json()
        assert "gaps" in data
        # Should indicate that tenant is not found
        assert any("not found" in gap.lower() or "no encontrado" in gap.lower()
                  for gap in data.get("gaps", []))

    def test_get_onboarding_status_empty_database(self, client: TestClient):
        """Test that status correctly reports when there's no data."""
        response = client.get(
            "/onboarding/status/empty-test-tenant",
        )

        assert response.status_code == 200
        data = response.json()
        # Empty tenant should have gaps
        assert len(data.get("gaps", [])) > 0


class TestOnboardingTenantCreationRequiresAuth:
    """Test authorization for tenant creation endpoint."""

    def test_create_tenant_without_auth_fails(self, client: TestClient):
        """Test that creating tenant without authentication fails."""
        # Minimal valid OnboardingForm
        tenant_data = {
            "tenant_id": "test-no-auth",
            "tenant_nombre": "Test",
            "industria": "servicios",
            "subcategoria": "sub",
            "descripcion_corta": "desc",
            "proposito_principal": "purpose",
            "acciones_habilitadas": ["action"],
            "mensaje_fallback": "Sorry",
            "entidades_clave": [],
            "hints": {
                "industria_context": "context",
                "terminos_clave": [],
                "preguntas_frecuentes_esperadas": [],
                "entidades_de_alta_frecuencia": [],
            },
        }

        response = client.post("/onboarding/tenant", json=tenant_data)

        assert response.status_code == 401

    def test_create_tenant_with_invalid_api_key_fails(self, client: TestClient):
        """Test that invalid API key is rejected."""
        tenant_data = {
            "tenant_id": "test-invalid-key",
            "tenant_nombre": "Test",
            "industria": "servicios",
            "subcategoria": "sub",
            "descripcion_corta": "desc",
            "proposito_principal": "purpose",
            "acciones_habilitadas": ["action"],
            "mensaje_fallback": "Sorry",
            "entidades_clave": [],
            "hints": {
                "industria_context": "context",
                "terminos_clave": [],
                "preguntas_frecuentes_esperadas": [],
                "entidades_de_alta_frecuencia": [],
            },
        }

        response = client.post(
            "/onboarding/tenant",
            json=tenant_data,
            headers={"X-API-Key": "wh_invalid_key_xyz"},
        )

        assert response.status_code == 401

    def test_create_tenant_as_cliente_fails(self, client: TestClient, test_cliente_user):
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

        tenant_data = {
            "tenant_id": "test-cliente-creation",
            "tenant_nombre": "Test",
            "industria": "servicios",
            "subcategoria": "sub",
            "descripcion_corta": "desc",
            "proposito_principal": "purpose",
            "acciones_habilitadas": ["action"],
            "mensaje_fallback": "Sorry",
            "entidades_clave": [],
            "hints": {
                "industria_context": "context",
                "terminos_clave": [],
                "preguntas_frecuentes_esperadas": [],
                "entidades_de_alta_frecuencia": [],
            },
        }

        response = client.post(
            "/onboarding/tenant",
            json=tenant_data,
            headers={"X-API-Key": api_key},
        )

        # Cliente should not have permission
        assert response.status_code == 403
