import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock
from app.main import app, get_current_user
from app.routers.agent_proxy_router import get_proxy_client

client = TestClient(app)


@pytest.fixture
def override_auth():
    """Override get_current_user to return a test user."""
    def _override(tenant_id="tenant_test", rol="cliente"):
        app.dependency_overrides[get_current_user] = lambda: {
            "id": "user_123",
            "email": "test@example.com",
            "tenant_id": tenant_id,
            "rol": rol,
            "is_active": True
        }
    return _override


@pytest.fixture
def override_proxy_client():
    """Override get_proxy_client to return a mock."""
    def _override(return_value):
        mock_proxy = AsyncMock()
        mock_proxy.forward.return_value = return_value
        app.dependency_overrides[get_proxy_client] = lambda: mock_proxy
        return mock_proxy
    return _override


@pytest.fixture(autouse=True)
def clear_overrides():
    """Clear dependency overrides after each test."""
    yield
    app.dependency_overrides.clear()


def test_agent_execute_proxy_success(override_auth, override_proxy_client):
    # Arrange
    override_auth("tenant_test")
    from datetime import datetime
    now = datetime.utcnow()
    mock_proxy = override_proxy_client({
        "trace_id": "abc123",
        "tenant_id": "tenant_test",
        "query": "test query",
        "result": [{"role": "assistant", "content": "Hello"}],
        "iterations": 1,
        "metadata": {"model": "gemma3"},
        "total_duration_ms": 1000,
        "timestamp_start": now,
        "timestamp_end": now,
    })

    # Act
    response = client.post(
        "/agent/execute",
        json={"query": "test query", "tenant_id": "tenant_test"},
        headers={"X-API-Key": "valid-key"}
    )

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["trace_id"] == "abc123"
    assert data["result"][0]["content"] == "Hello"
    mock_proxy.forward.assert_called_once()


def test_agent_config_proxy_success(override_auth, override_proxy_client):
    # Arrange
    override_auth("tenant_test")
    mock_proxy = override_proxy_client({
        "tenant_id": "tenant_test",
        "nombre": "Test Clinic",
        "descripcion": "Clínica de prueba",
        "config": {"proposito": "Agendar turnos", "tono": "profesional"},
        "servicios": [],
        "sedes": [],
        "coberturas": [],
        "routing_rules": []
    })

    # Act
    response = client.get("/agent/config", headers={"X-API-Key": "valid-key"})

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["tenant_id"] == "tenant_test"


def test_agent_traces_proxy_success(override_auth, override_proxy_client):
    override_auth("tenant_test")
    mock_proxy = override_proxy_client({
        "tenant_id": "tenant_test",
        "traces": [],
        "count": 0
    })

    response = client.get("/agent/traces?limit=10", headers={"X-API-Key": "valid-key"})
    assert response.status_code == 200
    mock_proxy.forward.assert_called_once()


def test_metrics_agent_proxy_success(override_auth, override_proxy_client):
    override_auth("tenant_test")
    mock_proxy = override_proxy_client({
        "tenant_id": "tenant_test",
        "metrics": []
    })

    # Note: Router has prefix="/agent", so metrics route is /agent/metrics/agent
    response = client.get("/agent/metrics/agent", headers={"X-API-Key": "valid-key"})
    assert response.status_code == 200
    mock_proxy.forward.assert_called_once()
