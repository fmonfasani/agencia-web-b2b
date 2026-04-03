# Backend-SaaS Production Ready: Proxy Endpoints & Full Integration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar backend-saas con endpoints proxy para consumir agentes desde backend-agents, dejando todo listo para producción con Swagger documentado, tests E2E, y deployment validado.

**Architecture:**
- Backend-SaaS actúa como API Gateway/Proxy hacia Backend-Agents
- Frontend solo conoce backend-saas:8000
- Autenticación unificada via API key (tabla "User" compartida)
- Comunicación interna via HTTP async (httpx) entre backends
- Multi-tenant isolation mantenida en ambos niveles

**Tech Stack:**
- FastAPI (proxy, auth, rate limiting)
- httpx (HTTP client async)
- PostgreSQL (shared auth + tenant data)
- Pydantic (request/response validation)
- pytest + testclient (testing)
- Docker + Docker Compose (deployment)

---

## File Structure (Before Implementation)

```
backend-saas/
├── app/
│   ├── main.py                      # Existing + new agent proxy router include
│   ├── auth_router.py               # Existing (unchanged)
│   ├── auth_service.py              # Existing (unchanged)
│   ├── onboarding_router.py         # Existing (unchanged)
│   ├── onboarding_service.py        # Existing (unchanged)
│   ├── tenant_router.py             # Existing (unchanged)
│   ├── tenant_models.py             # Existing (unchanged)
│   ├── models/
│   │   ├── agent_request_model.py  # Existing (needs review)
│   │   └── tracing_context.py      # Existing (needs review)
│   ├── lib/
│   │   └── proxy_client.py         # NEW: HTTP client para proxy
│   └── routers/
│       └── agent_proxy_router.py   # NEW: /agent/* endpoints proxy
├── tests/
│   ├── test_agent_proxy.py          # NEW: Proxy endpoint tests
│   └── test_e2e_agent_flow.py       # NEW: Full E2E test
├── .env.production                  # NEW: Production env template
├── Dockerfile                       # Update: Optimizar
└── docker-compose.prod.yml          # Update: Networks, healthchecks
```

---

## Task 1: Create Proxy Client Module

**Files:**
- Create: `backend-saas/app/lib/proxy_client.py`

**Purpose:** HTTP async client to forward requests to backend-agents with proper error handling, timeouts, and trace ID propagation.

- [ ] **Step 1: Write the failing test**

Create `backend-saas/tests/test_proxy_client.py`:

```python
import pytest
from unittest.mock import AsyncMock, patch
from app.lib.proxy_client import ProxyClient

@pytest.mark.asyncio
async def test_proxy_forward_success():
    # Arrange
    client = ProxyClient("http://backend-agents:8001")
    mock_response = {"status": "ok", "data": "test"}

    with patch("httpx.AsyncClient.request", new_callable=AsyncMock) as mock_request:
        mock_request.return_value.json.return_value = mock_response
        mock_request.return_value.raise_for_status = AsyncMock()

        # Act
        result = await client.forward("POST", "/agent/execute", json={"query": "test"})

        # Assert
        assert result == mock_response
        mock_request.assert_called_once()
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend-saas
python -m pytest tests/test_proxy_client.py -v
```

Expected: `ModuleNotFoundError: No module named 'app.lib.proxy_client'`

- [ ] **Step 3: Write minimal implementation**

Create `backend-saas/app/lib/proxy_client.py`:

```python
"""
proxy_client.py — Cliente HTTP asincrónico para proxy a backend-agents.
"""
import httpx
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

class ProxyClient:
    """Forward requests to backend-agents service."""

    def __init__(self, base_url: str, timeout: float = 60.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None

    async def __aenter__(self):
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.disconnect()

    async def connect(self):
        """Create async client."""
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=self.timeout)

    async def disconnect(self):
        """Close client."""
        if self._client:
            await self._client.aclose()
            self._client = None

    async def forward(
        self,
        method: str,
        path: str,
        *,
        json: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Forward request to backend-agents.

        Args:
            method: HTTP method (GET, POST, etc.)
            path: API path (e.g., "/agent/execute")
            json: JSON body
            params: Query params
            headers: HTTP headers (X-Trace-Id will be propagated)

        Returns:
            JSON response as dict

        Raises:
            httpx.HTTPError: On network/HTTP errors
        """
        if self._client is None:
            await self.connect()

        url = f"{self.base_url}{path}"

        # Ensure headers dict
        if headers is None:
            headers = {}

        # Log request
        logger.info(
            f"Proxy forward: {method} {path}",
            extra={"tenant_id": json.get("tenant_id") if json else None}
        )

        try:
            response = await self._client.request(
                method=method,
                url=url,
                json=json,
                params=params,
                headers=headers,
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Proxy error: {method} {path} - {e}")
            raise
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend-saas
python -m pytest tests/test_proxy_client.py -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/lib/proxy_client.py tests/test_proxy_client.py
git commit -m "feat(proxy): add ProxyClient for backend-agents communication"
```

---

## Task 2: Create Agent Proxy Router

**Files:**
- Create: `backend-saas/app/routers/agent_proxy_router.py`
- Modify: `backend-saas/app/main.py` (include router)

**Purpose:** Expose /agent/* endpoints in backend-saas that proxy to backend-agents, maintaining auth and tenant validation.

- [ ] **Step 1: Write the failing test**

Create `backend-saas/tests/test_agent_proxy_router.py`:

```python
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
from app.main import app

client = TestClient(app)

@pytest.fixture
def mock_proxy_client():
    with patch("app.routers.agent_proxy_router.get_proxy_client") as mock:
        yield mock

def test_agent_execute_proxy_success(mock_proxy_client):
    # Arrange
    mock_proxy = AsyncMock()
    mock_proxy.forward.return_value = {
        "trace_id": "abc123",
        "tenant_id": "tenant_test",
        "result": [{"role": "assistant", "content": "Hello"}],
        "iterations": 1,
        "metadata": {"model": "gemma3"},
        "total_duration_ms": 1000
    }
    mock_proxy_client.return_value = mock_proxy

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

def test_agent_config_proxy_success(mock_proxy_client):
    # Arrange
    mock_proxy = AsyncMock()
    mock_proxy.forward.return_value = {
        "tenant_id": "tenant_test",
        "nombre": "Test Clinic",
        "servicios": []
    }
    mock_proxy_client.return_value = mock_proxy

    # Act
    response = client.get("/agent/config", headers={"X-API-Key": "valid-key"})

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["tenant_id"] == "tenant_test"

def test_agent_traces_proxy_success(mock_proxy_client):
    mock_proxy = AsyncMock()
    mock_proxy.forward.return_value = {
        "tenant_id": "tenant_test",
        "traces": [],
        "count": 0
    }
    mock_proxy_client.return_value = mock_proxy

    response = client.get("/agent/traces?limit=10", headers={"X-API-Key": "valid-key"})
    assert response.status_code == 200

def test_metrics_agent_proxy_success(mock_proxy_client):
    mock_proxy = AsyncMock()
    mock_proxy.forward.return_value = {"tenant_id": "tenant_test", "metrics": []}
    mock_proxy_client.return_value = mock_proxy

    response = client.get("/metrics/agent", headers={"X-API-Key": "valid-key"})
    assert response.status_code == 200
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend-saas
python -m pytest tests/test_agent_proxy_router.py -v
```

Expected:
- `ImportError` for `get_proxy_client`
- `404 Not Found` for endpoints (router not included yet)

- [ ] **Step 3: Write minimal implementation**

Create `backend-saas/app/routers/agent_proxy_router.py`:

```python
"""
Agent Proxy Router — Proxies requests to backend-agents.
All endpoints require X-API-Key auth and validate tenant access.
"""
import logging
from fastapi import APIRouter, Request, Depends, HTTPException, Query
from typing import Optional

from app.auth_router import get_current_user
from app.lib.proxy_client import ProxyClient
from app.models.agent_request_model import AgentRequest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agent", tags=["Agent Proxy"])

# Backend-agents URL from env
import os
BACKEND_AGENTS_URL = os.getenv("BACKEND_AGENTS_URL", "http://localhost:8001")


async def get_proxy_client() -> ProxyClient:
    """Dependency: returns configured proxy client."""
    return ProxyClient(base_url=BACKEND_AGENTS_URL)


@router.post(
    "/execute",
    summary="Execute agent (proxied to backend-agents)",
    description="""
Executes the intelligent agent with RAG context.

This endpoint proxies the request to backend-agents:8001/agent/execute.
The API key is validated locally, then the request is forwarded with the same trace_id.
    """,
    response_model=dict,  # Will match backend-agents response
)
async def proxy_execute(
    req: AgentRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    proxy: ProxyClient = Depends(get_proxy_client),
):
    """
    Proxy for backend-agents /agent/execute.

    Validates:
    - User is active (via get_current_user)
    - User has access to requested tenant_id (admin can access any, cliente only own)
    """
    tenant_id = req.tenant_id or current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="tenant_id is required")

    # Validate tenant access
    from app.auth_router import require_admin  # or inline validation
    user_rol = current_user.get("rol", "")
    if user_rol not in ("admin", "superadmin", "super_admin") and current_user.get("tenant_id") != tenant_id:
        raise HTTPException(
            status_code=403,
            detail=f"No permission to access tenant '{tenant_id}'"
        )

    # Forward to backend-agents
    try:
        # Use trace_id from request or generate new
        trace_id = request.headers.get("X-Trace-Id")
        headers = {"X-Trace-Id": trace_id} if trace_id else {}

        result = await proxy.forward(
            "POST",
            "/agent/execute",
            json=req.dict(exclude_none=True),
            headers=headers
        )
        return result
    except httpx.HTTPError as e:
        logger.error(f"Proxy error to backend-agents: {e}")
        raise HTTPException(status_code=502, detail=f"Agent service unavailable: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error in proxy: {e}")
        raise HTTPException(status_code=500, detail="Internal proxy error")


@router.get(
    "/config",
    summary="Get agent configuration (proxied)",
    description="Returns tenant configuration: services, locations, coverages, routing rules.",
)
async def proxy_config(
    current_user: dict = Depends(get_current_user),
    proxy: ProxyClient = Depends(get_proxy_client),
):
    """Proxy for backend-agents /agent/config."""
    tenant_id = current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="User has no tenant_id")

    try:
        result = await proxy.forward(
            "GET",
            "/agent/config",
            headers={"X-API-Key": request.headers.get("X-API-Key")}  # Forward auth header
        )
        return result
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Agent service unavailable: {str(e)}")


@router.get(
    "/traces",
    summary="Get agent traces (proxied)",
    description="Returns recent execution traces for the tenant.",
)
async def proxy_traces(
    limit: int = Query(50, ge=1, le=100, description="Number of traces to return"),
    current_user: dict = Depends(get_current_user),
    proxy: ProxyClient = Depends(get_proxy_client),
):
    """Proxy for backend-agents /agent/traces."""
    tenant_id = current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="User has no tenant_id")

    try:
        result = await proxy.forward(
            "GET",
            "/agent/traces",
            params={"limit": limit},
            headers={"X-API-Key": request.headers.get("X-API-Key")}
        )
        return result
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Agent service unavailable: {str(e)}")


@router.get(
    "/metrics/agent",
    summary="Get agent metrics (proxied)",
    description="Returns convergence metrics for the tenant.",
)
async def proxy_metrics(
    current_user: dict = Depends(get_current_user),
    proxy: ProxyClient = Depends(get_proxy_client),
):
    """Proxy for backend-agents /metrics/agent."""
    tenant_id = current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="User has no tenant_id")

    try:
        result = await proxy.forward(
            "GET",
            "/metrics/agent",
            headers={"X-API-Key": request.headers.get("X-API-Key")}
        )
        return result
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Agent service unavailable: {str(e)}")
```

**Note:** Import `httpx` at the top for `HTTPError`.

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend-saas
python -m pytest tests/test_agent_proxy_router.py -v
```

Expected: All tests PASS (with mocked proxy)

- [ ] **Step 5: Include router in main.py**

Modify `backend-saas/app/main.py`:

Find near line 70 (after `app.include_router(onboarding_router)`):
Add:
```python
from app.routers.agent_proxy_router import router as agent_proxy_router
app.include_router(agent_proxy_router)
```

- [ ] **Step 6: Run tests again to verify integration**

```bash
cd backend-saas
python -m pytest tests/test_agent_proxy_router.py -v
```

Expected: Still PASS (router included, but proxy still mocked)

- [ ] **Step 7: Commit**

```bash
git add app/routers/agent_proxy_router.py app/main.py tests/test_agent_proxy_router.py
git commit -m "feat(proxy): add /agent/* proxy endpoints to backend-saas"
```

---

## Task 3: Verify AgentRequest Model Compatibility

**Files:**
- Modify: `backend-saas/app/models/agent_request_model.py` (if needed)
- Test: `backend-saas/tests/test_agent_request_model.py` (add if missing)

**Purpose:** Ensure the AgentRequest model used by backend-saas matches what backend-agents expects.

- [ ] **Step 1: Compare models**

Read `backend-agents/app/models.py` and `backend-saas/app/models/agent_request_model.py`.
If they differ, align backend-saas model to backend-agents.

Current expected fields (from backend-agents):
```python
class AgentRequest(BaseModel):
    query: str
    tenant_id: str
    user_id: Optional[str] = None
    conversation_id: Optional[str] = None
    trace_id: Optional[str] = None
    enable_detailed_trace: bool = False
    max_iterations: Optional[int] = Field(default=5, ge=1, le=10)
    temperature: Optional[float] = Field(default=0.7, ge=0.0, le=2.0)
```

- [ ] **Step 2: Update model if necessary**

If `backend-saas/app/models/agent_request_model.py` differs, update it to match exactly.

- [ ] **Step 3: Write validation test**

Create `backend-saas/tests/test_agent_request_model.py`:

```python
from app.models.agent_request_model import AgentRequest
import pytest

def test_agent_request_valid():
    req = AgentRequest(query="test", tenant_id="t1")
    assert req.query == "test"
    assert req.tenant_id == "t1"
    assert req.max_iterations == 5
    assert req.temperature == 0.7

def test_agent_request_extra_fields_allowed():
    """Optional fields should work."""
    req = AgentRequest(
        query="test",
        tenant_id="t1",
        user_id="u1",
        conversation_id="c1",
        trace_id="trace123",
        enable_detailed_trace=True,
        max_iterations=3,
        temperature=0.5
    )
    assert req.user_id == "u1"
```

- [ ] **Step 4: Run test**

```bash
cd backend-saas
python -m pytest tests/test_agent_request_model.py -v
```

Expected: PASS

- [ ] **Step 5: Commit (only if changes were made)**

```bash
git add app/models/agent_request_model.py tests/test_agent_request_model.py
git commit -m "fix(models): align AgentRequest with backend-agents"
```

---

## Task 4: Update .env.production Template

**Files:**
- Create: `backend-saas/.env.production` (new file)
- Modify: `backend-saas/.env.example` (update)

**Purpose:** Production-ready environment configuration.

- [ ] **Step 1: Create .env.production**

```bash
# backend-saas/.env.production
# Copy from .env.example and add missing variables

# Database (required)
DATABASE_URL=postgresql://postgres:YOUR_SECURE_PASSWORD@postgres:5432/agencia_web_b2b

# CORS (required)
ALLOWED_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com,https://app.yourdomain.com

# Environment (required)
ENVIRONMENT=production
LOG_LEVEL=WARNING

# Backend Agents URL (required for proxy)
BACKEND_AGENTS_URL=http://backend-agents:8001

# Rate limiting (optional)
RATE_LIMIT_PER_MINUTE=100

# Security (optional)
ALLOW_FALLBACK_TENANT=false
DEFAULT_TENANT_ID=default
```

- [ ] **Step 2: Update .env.example**

Add `BACKEND_AGENTS_URL` to `backend-saas/.env.example`:

```diff
GROQ_API_KEY = your_api_key_here
DATABASE_URL = postgresql://postgres:password@localhost:5432/agencia_web_b2b
ALLOW_FALLBACK_TENANT = true
DEFAULT_TENANT_ID = default
ENVIRONMENT = development
LOG_LEVEL = INFO
+BACKEND_AGENTS_URL = http://localhost:8001
```

- [ ] **Step 3: Commit**

```bash
git add .env.example backend-saas/.env.production
git commit -m "feat(env): add production env template and BACKEND_AGENTS_URL"
```

---

## Task 5: Update Dockerfile (Optimize for Production)

**Files:**
- Modify: `backend-saas/Dockerfile`
- Modify: `backend-saas/docker-compose.prod.yml` (if needed)

**Purpose:** Multi-stage build, non-root user, smaller image.

- [ ] **Step 1: Review current Dockerfile**

Read `backend-saas/Dockerfile`. If it uses `python:3.11-slim` without non-root user, optimize.

- [ ] **Step 2: Write optimized Dockerfile**

Replace content:

```dockerfile
# backend-saas/Dockerfile
# Multi-stage build for production

# Stage 1: Builder
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends gcc && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Stage 2: Runtime
FROM python:3.11-slim

WORKDIR /app

# Create non-root user
RUN useradd --create-home --shell /bin/bash app && \
    chown -R app:app /app

# Copy dependencies from builder
COPY --from=builder /root/.local /root/.local

# Copy application code
COPY --chown=app:app . .

# Make sure scripts in .local are usable
ENV PATH=/root/.local/bin:$PATH

# Switch to non-root user
USER app

# Expose port
EXPOSE 8000

# Run server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 3: Update docker-compose.prod.yml (if needed)**

Ensure backend-saas service has proper environment and networks:

```yaml
version: '3.8'

services:
  backend-saas:
    build:
      context: ./backend-saas
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
      - BACKEND_AGENTS_URL=${BACKEND_AGENTS_URL:-http://backend-agents:8001}
      - ENVIRONMENT=production
      - LOG_LEVEL=${LOG_LEVEL:-WARNING}
    depends_on:
      postgres:
        condition: service_healthy
      backend-agents:
        condition: service_healthy
    networks:
      - app-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  backend-agents:
    # ... existing config (ensure it has healthcheck)
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  postgres:
    # ... existing
    networks:
      - app-network

  qdrant:
    # ... existing
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  pgdata:
  qdrant_storage:
```

- [ ] **Step 4: Commit**

```bash
git add backend-saas/Dockerfile backend-saas/docker-compose.prod.yml
git commit -m "feat(docker): optimize Dockerfile with multi-stage build, add healthchecks and network isolation"
```

---

## Task 6: Write End-to-End Integration Test

**Files:**
- Create: `backend-saas/tests/test_e2e_agent_flow.py`

**Purpose:** Full flow: register → login → create tenant → upload → ingest → execute agent (mocked backend-agents).

- [ ] **Step 1: Write comprehensive E2E test**

```python
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
import json

from app.main import app

client = TestClient(app)

@pytest.fixture
def mock_proxy_for_e2e():
    """Mock the proxy client to simulate backend-agents responses."""
    with patch("app.routers.agent_proxy_router.get_proxy_client") as mock:
        proxy_instance = AsyncMock()

        # Mock /agent/execute response
        proxy_instance.forward.return_value = {
            "trace_id": "e2e-trace-123",
            "tenant_id": "tenant_clinica_test",
            "query": "¿Qué servicios ofrecen?",
            "iterations": 2,
            "result": [
                {"role": "assistant", "content": "Buscando información..."},
                {"role": "assistant", "content": "Ofrecemos: cardiología, dermatología, pediatría."}
            ],
            "metadata": {"model": "gemma3", "rag_queries": 1},
            "total_duration_ms": 2500,
            "timestamp_start": "2026-04-02T10:00:00",
            "timestamp_end": "2026-04-02T10:00:02.5"
        }
        mock.return_value = proxy_instance
        yield mock

def test_full_agent_flow_e2e(mock_proxy_for_e2e):
    """
    Test complete flow:
    1. Register admin user
    2. Login and get API key
    3. Create tenant
    4. Execute agent query (via proxy)
    """
    # 1. Register admin (for creating tenant)
    register_resp = client.post(
        "/auth/register",
        json={
            "email": "admin@clinica.com",
            "password": "SecurePass123!",
            "nombre": "Admin Clinica",
            "rol": "admin"
        }
    )
    assert register_resp.status_code == 200
    # Admin needs to be activated (in real scenario, existing superadmin would activate)
    # For test, we'll skip and go directly to create-analista?

    # Actually, let's use existing admin pattern: create admin directly via /auth/create-analista
    # But we need an initial admin. For E2E we can bypass activation or pre-create user.

    # Alternative: Assume there's already an active admin with API key
    # We'll directly create an analista for the tenant workflow
    # In real test, we would have a fixture that creates a superadmin first

    # For this test, we'll mock get_current_user dependency directly? No, E2E should use real auth.

    # Let's adjust: Use a simpler approach - test the proxy chain separately.
    # Full E2E requires DB seeding. We'll do partial E2E with mocked DB later.

    # Instead, test just the proxy flow with real authentication:
    # Pre-requisite: Create user in DB (using direct DB access in fixture)

    # For brevity in plan, the structure is more important than full DB setup
    # We'll show the structure, implement in execution phase.
    pass  # Placeholder

# Actual test will use fixtures to seed DB:
# - create_superadmin fixture
# - create_tenant fixture
# Then run through full flow with mocked proxy responses.
```

We'll flesh out this test in execution phase with proper fixtures.

- [ ] **Step 2: Write test fixtures (later in execution)**

- [ ] **Step 3: Run test (it will fail until fixtures added)**

```bash
cd backend-saas
python -m pytest tests/test_e2e_agent_flow.py -v -k "test_full_agent_flow_e2e"
```

- [ ] **Step 4: Implement fixtures and complete test** (during execution)

- [ ] **Step 5: Commit placeholder**

```bash
git add tests/test_e2e_agent_flow.py
git commit -m "test(e2e): add E2E agent flow test skeleton (to be completed)"
```

---

## Task 7: Health Check Enhancement

**Files:**
- Modify: `backend-saas/app/main.py` (health endpoint)
- Optional: Create `backend-saas/app/lib/health.py`

**Purpose:** Health check should verify DB connectivity and backend-agents reachability.

- [ ] **Step 1: Update health endpoint**

Modify `/health` in `backend-saas/app/main.py`:

```python
@app.get("/health")
async def health():
    """Comprehensive health check."""
    import psycopg2
    import os

    status = {"status": "ok", "service": "backend-saas"}
    checks = {}

    # Check PostgreSQL
    try:
        dsn = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/agencia_web_b2b")
        conn = psycopg2.connect(dsn, connect_timeout=2)
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.close()
        conn.close()
        checks["postgresql"] = "ok"
    except Exception as e:
        checks["postgresql"] = f"error: {str(e)}"
        status["status"] = "degraded"

    # Check backend-agents (optional, non-blocking)
    try:
        import httpx
        async with httpx.AsyncClient(timeout=2.0) as client:
            agents_url = os.getenv("BACKEND_AGENTS_URL", "http://localhost:8001")
            resp = await client.get(f"{agents_url}/health")
            if resp.status_code == 200:
                checks["backend_agents"] = "ok"
            else:
                checks["backend_agents"] = f"unhealthy: {resp.status_code}"
                status["status"] = "degraded"
    except Exception as e:
        checks["backend_agents"] = f"error: {str(e)}"
        # Don't mark degraded if agents down (they're optional for health check)

    status["checks"] = checks
    return status
```

- [ ] **Step 2: Test health checks**

Create `backend-saas/tests/test_health.py`:

```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "backend-saas"
    assert "checks" in data
    assert "postgresql" in data["checks"]
```

- [ ] **Step 3: Run test**

```bash
cd backend-saas
python -m pytest tests/test_health.py -v
```

Expected: PASS (if DB is running locally)

- [ ] **Step 4: Commit**

```bash
git add app/main.py tests/test_health.py
git commit -m "feat(health): add comprehensive health check with DB and agents status"
```

---

## Task 8: Final Integration & Documentation

**Files:**
- Update: `backend-saas/README.md` (or create docs/API.md)
- Update: Swagger UI examples (via docstrings in code)

**Purpose:** Document the new proxy endpoints and update API documentation.

- [ ] **Step 1: Update main.py docstring**

Update FastAPI app description in `backend-saas/app/main.py` to include agent proxy endpoints:

```python
app = FastAPI(
    title="Webshooks SaaS API",
    description="""
API para gestión multi-tenant de agentes inteligentes.

**Flujo principal:**
1. Registro de usuario → POST /auth/register
2. Activación por admin → POST /auth/activate
3. Login → POST /auth/login (obtener API Key)
4. Crear tenant → POST /onboarding/tenant
5. Subir documentos → POST /onboarding/upload
6. Ingesta con LLM → POST http://backend-agents:8001/onboarding/ingest
7. Consultar agente → POST /agent/execute (proxied to backend-agents)

**Endpoints de Agente (proxied):**
- `POST /agent/execute` → Ejecutar agente con contexto RAG
- `GET /agent/config` → Obtener configuración del tenant (servicios, sedes, coberturas)
- `GET /agent/traces` → Ver trazas de ejecución
- `GET /metrics/agent` → Métricas de convergencia

**Roles:**
- `cliente`: acceso solo a su propio tenant
- `analista`: gestiona todos los tenants
- `admin` / `superadmin`: control total

**Autenticación:**
Todos los endpoints requieren header `X-API-Key` (excepto /auth/*, /health).
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)
```

- [ ] **Step 2: Add response examples to proxy router**

In `backend-saas/app/routers/agent_proxy_router.py`, enhance docstrings with examples:

```python
@router.post("/execute", ...)
async def proxy_execute(...):
    """
    ...

    **Ejemplo de request:**
    ```json
    {
      "query": "¿Qué servicios de cardiología ofrecen?",
      "tenant_id": "clinica_san_juan",
      "enable_detailed_trace": true
    }
    ```

    **Ejemplo de response:**
    ```json
    {
      "trace_id": "abc123def",
      "tenant_id": "clinica_san_juan",
      "iterations": 2,
      "result": [
        {"role": "assistant", "content": "Voy a buscar..."},
        {"role": "assistant", "content": "Ofrecemos cardiología clínica y pediátrica."}
      ],
      "metadata": {"model": "gemma3:latest", "rag_queries": 1},
      "total_duration_ms": 2400
    }
    ```
    """
```

- [ ] **Step 3: Create API documentation file**

Create `backend-saas/docs/API.md` with quick reference:

```markdown
# API Reference — Backend-SaaS

## Authentication

All protected endpoints require header:

```
X-API-Key: wh_xxxxx
```

Obtained via `POST /auth/login`.

---

## Agent Endpoints (Proxied)

### POST /agent/execute

Execute the intelligent agent with RAG.

**Body:** `AgentRequest`

**Response:** `AgentResponse`

---

### GET /agent/config

Get tenant configuration (services, locations, coverages).

**Response:** JSON object with:
```json
{
  "tenant_id": "string",
  "nombre": "string",
  "descripcion": "string",
  "config": {...},
  "servicios": [...],
  "sedes": [...],
  "coberturas": [...],
  "routing_rules": [...]
}
```

---

### GET /agent/traces

Get recent execution traces for the tenant.

**Query Params:**
- `limit` (int, default 50, max 100)

**Response:**
```json
{
  "tenant_id": "string",
  "count": 10,
  "traces": [...]
}
```

---

### GET /metrics/agent

Get agent convergence metrics.

**Response:**
```json
{
  "tenant_id": "string",
  "metrics": [...]
}
```

---

## Onboarding Endpoints

### POST /onboarding/tenant

Create tenant from onboarding form.

**Body:** `OnboardingForm`

**Response:**
```json
{
  "status": "ok",
  "tenant_id": "clinica_san_juan",
  "mensaje": "...",
  "proximo_paso": "POST http://localhost:8001/onboarding/ingest (backend-agents)"
}
```

---

More endpoints... See Swagger UI at `/docs`.
```

- [ ] **Step 4: Commit**

```bash
git add app/main.py docs/API.md
git commit -m "docs: add API reference and enhance Swagger descriptions"
```

---

## Task 9: Complete Missing Tests

**Files:**
- Create: `backend-saas/tests/test_multi_tenant_isolation.py` (enhance if exists)
- Run all tests and fix failures

**Purpose:** Ensure multi-tenant security is enforced in proxy endpoints.

- [ ] **Step 1: Write isolation test**

Create `backend-saas/tests/test_multi_tenant_isolation_proxy.py`:

```python
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

from app.main import app
from app.auth_service import create_user, login_user

client = TestClient(app)

@pytest.fixture(scope="module")
def setup_tenants_and_users():
    """Create two tenants with各自的 users."""
    # Tenant A
    user_a = create_user(
        email="clienteA@clinica.com",
        password="pass123",
        nombre="Cliente A",
        rol="cliente",
        tenant_id="tenant_a",
        activo=True
    )
    # Tenant B
    user_b = create_user(
        email="clienteB@clinica.com",
        password="pass123",
        nombre="Cliente B",
        rol="cliente",
        tenant_id="tenant_b",
        activo=True
    )
    yield {
        "user_a": user_a,
        "user_b": user_b
    }
    # Cleanup not needed for test DB

def test_tenant_isolation_proxy(setup_tenants_and_users):
    """
    Verify that client A cannot access tenant B's data via proxy.
    """
    user_a = setup_tenants_and_users["user_a"]
    api_key_a = user_a["api_key"]

    with patch("app.routers.agent_proxy_router.get_proxy_client") as mock_proxy:
        mock_proxy.return_value = AsyncMock()
        mock_proxy.return_value.forward.return_value = {"result": []}

        # Try to execute as tenant A but request tenant B's data
        response = client.post(
            "/agent/execute",
            json={
                "query": "test",
                "tenant_id": "tenant_b"  # Trying to access other tenant
            },
            headers={"X-API-Key": api_key_a}
        )

        # Should be FORBIDDEN (403), not proxied
        assert response.status_code == 403
        assert "No permission" in response.json()["detail"]

        # The proxy should NOT have been called
        mock_proxy.return_value.forward.assert_not_called()

def test_admin_can_access_any_tenant(setup_tenants_and_users):
    """Admin users can access any tenant."""
    admin = create_user(
        email="admin@sys.com",
        password="adminpass",
        nombre="SuperAdmin",
        rol="superadmin",
        tenant_id=None,
        activo=True
    )
    api_key_admin = admin["api_key"]

    with patch("app.routers.agent_proxy_router.get_proxy_client") as mock_proxy:
        mock_proxy.return_value = AsyncMock()
        mock_proxy.return_value.forward.return_value = {"result": []}

        response = client.post(
            "/agent/execute",
            json={
                "query": "test",
                "tenant_id": "tenant_a"
            },
            headers={"X-API-Key": api_key_admin}
        )

        # Should be OK (200 or 502 if backend-agents unhappy, but not 403)
        assert response.status_code != 403
        mock_proxy.return_value.forward.assert_called_once()
```

- [ ] **Step 2: Run tests**

```bash
cd backend-saas
python -m pytest tests/test_multi_tenant_isolation_proxy.py -v
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/test_multi_tenant_isolation_proxy.py
git commit -m "test(security): add multi-tenant isolation tests for proxy endpoints"
```

---

## Task 10: Final Validation & Deployment Prep

**Actions:**
- Run all tests
- Check imports with py_compile
- Validate .env files
- Update deployment scripts if needed

- [ ] **Step 1: Run all tests**

```bash
cd backend-saas
python -m pytest tests/ -v --tb=short
```

All tests must pass.

- [ ] **Step 2: Syntax check**

```bash
python -m py_compile app/**/*.py
```

No errors.

- [ ] **Step 3: Verify Swagger UI**

Start server:
```bash
uvicorn app.main:app --reload --port 8000
```

Visit http://localhost:8000/docs and verify:
- All endpoints documented
- Examples visible
- /agent/execute, /agent/config, /agent/traces, /metrics/agent present

- [ ] **Step 4: Update deployment scripts if needed**

Check `scripts/deploy-prod.sh` includes:
- Build backend-saas Docker image
- Copy .env.production to container
- docker-compose up -d

- [ ] **Step 5: Final commit and push**

```bash
git add .
git commit -m "feat: backend-saas production ready with agent proxy endpoints"
```

---

## Post-Implementation Checklist

After completing all tasks, verify:

- [ ] All backend-saas endpoints work via Swagger with real API key
- [ ] Proxy forwards correctly to backend-agents (check logs)
- [ ] Multi-tenant isolation enforced (cliente can't access other tenants)
- [ ] Health check reports correct status (DB + agents)
- [ ] .env.production has all required vars
- [ ] Dockerfile uses non-root user, multi-stage build
- [ ] docker-compose.prod.yml has proper networks and healthchecks
- [ ] All tests pass (pytest)
- [ ] No hardcoded secrets or IPs
- [ ] CORS configured properly
- [ ] Rate limiting working (check logs)
- [ ] Documentation updated (API.md, Swagger docstrings)

---

## Rollback Plan

If something fails after deployment:

1. Revert to previous commit: `git revert <last_commit_hash>`
2. Rebuild and redeploy: `./scripts/deploy-prod.sh`
3. Or use Docker rollback: keep previous image tags and redeploy old version.

---

**Plan complete and saved to `docs/superpowers/plans/backend-saas-production-ready.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
