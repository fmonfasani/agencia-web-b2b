import pytest
from unittest.mock import AsyncMock, patch
from app.main import app, get_current_tenant

@pytest.fixture
def override_tenant():
    # Helper to override the dependency in tests
    def _override(tenant_id: str):
        app.dependency_overrides[get_current_tenant] = lambda: tenant_id
    yield _override
    app.dependency_overrides.clear()

def test_execute_with_matching_tenant(client, override_tenant):
    """Test success path: session Match."""
    override_tenant("tenant_ok")
    
    with patch("app.main.LangGraphEngine") as MockEngine:
        mock_instance = MockEngine.return_value
        mock_instance.run = AsyncMock(return_value=([{"role": "tool", "content": "ok"}], {"iterations": 1}))
        
        # task must be >= 3 chars
        resp = client.post("/agent/execute", json={"task": "execute core task", "tenant_id": "tenant_ok"})
        assert resp.status_code == 200
        assert resp.json()["metadata"]["iterations"] == 1

def test_execute_with_mismatching_tenant(client, override_tenant):
    """Test failure path: Tenant spoofing detected."""
    override_tenant("tenant_real")
    
    resp = client.post("/agent/execute", json={"task": "execute core task", "tenant_id": "tenant_fake"})
    assert resp.status_code == 403
    assert "Tenant ID mismatch" in resp.json()["detail"]

def test_execute_unauthorized_no_session(client):
    """Test failure path: Missing session cookie."""
    # Ensure no override exists for this test
    app.dependency_overrides.clear()
    
    resp = client.post("/agent/execute", json={"task": "execute core task", "tenant_id": "any"})
    assert resp.status_code == 401
    assert "No session token found" in resp.json()["detail"]
