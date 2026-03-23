"""
Tests for multi-tenant security with the new API Key auth model.
get_agent_tenant dependency: X-API-Key → fallback (ALLOW_FALLBACK_TENANT) → 401
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app, get_agent_tenant


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def override_tenant():
    """Override get_agent_tenant to inject a test user dict."""
    def _override(tenant_id: str):
        app.dependency_overrides[get_agent_tenant] = lambda: {
            "id": 1,
            "email": "test@test.com",
            "nombre": "Test",
            "rol": "cliente",
            "tenant_id": tenant_id,
        }
    yield _override
    app.dependency_overrides.clear()


def test_execute_with_valid_tenant(client, override_tenant):
    """Tenant from token is used — not the request body."""
    override_tenant("tenant_real")

    with patch("app.main.LangGraphEngine") as MockEngine:
        mock_instance = MockEngine.return_value
        mock_instance.run = AsyncMock(
            return_value=(
                [{"role": "assistant", "content": "ok"}],
                {"iterations": 1, "finish_reason": "results_found"},
            )
        )

        resp = client.post(
            "/agent/execute",
            json={"query": "qué coberturas tienen", "tenant_id": "ignored_body_value"},
        )
        assert resp.status_code == 200
        data = resp.json()
        # tenant_id in response must come from token, not body
        assert data["tenant_id"] == "tenant_real"
        assert data["metadata"]["iterations"] == 1


def test_execute_unauthorized_no_api_key(client):
    """Without API key and no fallback env var → 401."""
    app.dependency_overrides.clear()

    import os
    original = os.environ.pop("ALLOW_FALLBACK_TENANT", None)
    try:
        resp = client.post(
            "/agent/execute",
            json={"query": "qué coberturas tienen", "tenant_id": "any"},
        )
        assert resp.status_code == 401
    finally:
        if original is not None:
            os.environ["ALLOW_FALLBACK_TENANT"] = original


def test_execute_invalid_api_key_returns_401(client):
    """Invalid API key → 401."""
    app.dependency_overrides.clear()

    import os
    original = os.environ.pop("ALLOW_FALLBACK_TENANT", None)
    try:
        resp = client.post(
            "/agent/execute",
            headers={"X-API-Key": "wh_invalid_key_that_does_not_exist"},
            json={"query": "qué coberturas tienen", "tenant_id": "any"},
        )
        assert resp.status_code == 401
        assert "inválida" in resp.json()["detail"].lower() or "inv" in resp.json()["detail"].lower()
    finally:
        if original is not None:
            os.environ["ALLOW_FALLBACK_TENANT"] = original


def test_tenant_isolation_engine_scoped_to_token_tenant(client):
    """
    Propiedad de seguridad central: LangGraphEngine se instancia con el
    tenant_id del TOKEN, nunca con el del body.

    Dos llamadas con tokens de tenants distintos deben producir:
    - Respuestas con tenant_id distintos (A y B)
    - LangGraphEngine instanciado con tenant_id A y B respectivamente
    - El body tenant_id no puede sobreescribir el del token
    """
    results = {}

    for token_tenant, body_tenant in [("tenant_A", "tenant_B"), ("tenant_B", "tenant_A")]:
        app.dependency_overrides[get_agent_tenant] = lambda t=token_tenant: {
            "id": 1,
            "email": f"{t}@test.com",
            "nombre": "Test",
            "rol": "cliente",
            "tenant_id": t,
        }

        captured = {}

        def fake_engine_init(self, tenant_id, tracing_context=None):
            captured["tenant_id"] = tenant_id

        with patch("app.main.LangGraphEngine") as MockEngine:
            MockEngine.return_value.run = AsyncMock(
                return_value=(
                    [{"role": "assistant", "content": "ok"}],
                    {"iterations": 1, "finish_reason": "no_results"},
                )
            )
            # Capturar el tenant_id con el que se instancia el engine
            MockEngine.side_effect = lambda tenant_id, **kw: (
                captured.__setitem__("tenant_id", tenant_id) or MockEngine.return_value
            )

            resp = client.post(
                "/agent/execute",
                # body tiene el tenant del OTRO — no debe usarse
                json={"query": "test isolation", "tenant_id": body_tenant},
            )

        assert resp.status_code == 200, f"token={token_tenant}: {resp.json()}"
        data = resp.json()

        # La respuesta refleja el tenant del TOKEN, no del body
        assert data["tenant_id"] == token_tenant, (
            f"Esperado tenant del token '{token_tenant}', "
            f"obtenido '{data['tenant_id']}' (body era '{body_tenant}')"
        )

        # El engine fue construido con el tenant del token
        assert captured.get("tenant_id") == token_tenant, (
            f"LangGraphEngine instanciado con '{captured.get('tenant_id')}' "
            f"en lugar de '{token_tenant}'"
        )

        results[token_tenant] = data["tenant_id"]

    # Los dos requests produjeron tenant_ids distintos
    assert results["tenant_A"] != results["tenant_B"]
    app.dependency_overrides.clear()


def test_execute_fallback_tenant_uses_env_default(client):
    """With ALLOW_FALLBACK_TENANT=true and no key, uses DEFAULT_TENANT_ID."""
    app.dependency_overrides.clear()

    import os
    os.environ["ALLOW_FALLBACK_TENANT"] = "true"
    os.environ["DEFAULT_TENANT_ID"] = "tenant_env"

    with patch("app.main.LangGraphEngine") as MockEngine:
        mock_instance = MockEngine.return_value
        mock_instance.run = AsyncMock(
            return_value=(
                [{"role": "assistant", "content": "fallback ok"}],
                {"iterations": 1, "finish_reason": "no_results"},
            )
        )

        resp = client.post(
            "/agent/execute",
            json={"query": "test fallback tenant", "tenant_id": "ignored"},
        )
        assert resp.status_code == 200
        assert resp.json()["tenant_id"] == "tenant_env"
