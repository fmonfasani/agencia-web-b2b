# 🏗️ ARCHITECTURE & DESIGN - Webshooks Platform

**Última Actualización:** 2026-04-02
**Versión:** 1.0 - Production Ready
**Autor:** Agencia B2B Development Team

---

## 📋 Tabla de Contenidos

1. [System Architecture](#system-architecture)
2. [Service Separation](#service-separation)
3. [Data Flow](#data-flow)
4. [Design Patterns](#design-patterns)
5. [Database Design](#database-design)

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                                │
│         (Frontend: Next.js 16 @ localhost:3001)                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    X-API-Key Header
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                  BACKEND-SAAS:8000                              │
│              (API Gateway & Control Plane)                      │
│                                                                  │
│  ✓ Authentication (/auth/*)                                    │
│  ✓ Tenant Management (/tenant/*)                               │
│  ✓ Onboarding (/onboarding/*)                                  │
│  ✓ Agent Proxy (/agent/*)  ──→ ProxyClient (httpx)            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    Internal Network
                             │
┌────────────────────────────▼────────────────────────────────────┐
│               BACKEND-AGENTS:8001                               │
│          (AI Engine - INTERNAL ONLY)                           │
│                                                                  │
│  ✓ Agent Execution (LangGraph)                                 │
│  ✓ RAG (Qdrant Search)                                         │
│  ✓ LLM Orchestration (Ollama/OpenRouter)                       │
│  ✓ Tracing & Metrics                                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    PostgreSQL           Qdrant              Ollama
    (Shared DB)       (Vectors/RAG)      (LLM Engine)
    - Users           - Knowledge          - qwen2.5:0.5b
    - Tenants         - Embeddings         - gemma3:latest
    - Traces          - Indices            - Claude 3.5 (via OpenRouter)
```

---

## Service Separation

### ✅ backend-saas (SaaS Platform)

**Purpose:** Multi-tenant control plane, API Gateway, Authentication
**Port:** 8000
**Exposed:** YES (Public)

**Responsibilities:**
- User registration & authentication (JWT/API Keys)
- Tenant management (CRUD)
- Onboarding workflow (file upload, ingestion prep)
- Rate limiting & CORS
- Agent proxy (transparent forwarding)
- Health checks

**Tech Stack:**
- FastAPI (Python)
- PostgreSQL (shared database)
- Pydantic (validation)
- ProxyClient (httpx for service-to-service)

**Key Files:**
```
backend-saas/app/
├── main.py                    # FastAPI app + routing
├── auth_router.py             # /auth/* endpoints
├── auth_service.py            # Authentication logic
├── onboarding_router.py       # /onboarding/* endpoints
├── onboarding_service.py      # Onboarding logic + embeddings
├── tenant_router.py           # /tenant/* endpoints
├── routers/
│   └── agent_proxy_router.py  # /agent/* proxy endpoints
├── models/
│   ├── agent_request_model.py # Agent request/response schemas
│   └── ...
├── lib/
│   ├── proxy_client.py        # HTTP proxy client
│   ├── logging_utils.py       # Structured logging
│   └── health_check.py        # Health probe
└── db/
    ├── models.py              # DB schemas
    ├── trace_service.py       # Trace persistence
    └── migrations/            # Alembic migrations
```

---

### 🤖 backend-agents (AI Agent Engine)

**Purpose:** AI/RAG processing engine, LLM orchestration
**Port:** 8001
**Exposed:** NO (Internal only)

**Responsibilities:**
- Agent execution (LangGraph orchestration)
- RAG (semantic search in Qdrant)
- LLM calls (Ollama local or OpenRouter cloud)
- Tool execution & planning
- Trace generation & persistence
- Performance metrics

**Tech Stack:**
- FastAPI (Python)
- LangGraph (AI orchestration)
- Ollama/OpenRouter (LLM)
- Qdrant (vector database)
- PostgreSQL (trace storage)

**Key Files:**
```
backend-agents/app/
├── main.py                    # FastAPI app + agent endpoints
├── routers/
│   └── agent_router.py        # /agent/execute, /metrics, etc
├── engine/
│   ├── langgraph_engine.py    # LangGraph setup & compilation
│   ├── planner.py             # Agent planning loop (main logic)
│   ├── state.py               # GraphState definition
│   └── adapters.py            # LLM adapter abstraction
├── tools/
│   ├── rag.py                 # Qdrant semantic search
│   └── registry.py            # Tool registration & execution
├── llm/
│   ├── factory.py             # LLM provider factory (Ollama/OpenRouter)
│   ├── ollama_provider.py     # Local Ollama
│   └── openrouter_provider.py # Cloud LLM with key rotation
├── qdrant/
│   └── client.py              # Qdrant wrapper
├── auth/
│   └── agent_auth.py          # X-API-Key validation
├── db/
│   ├── models.py              # DB schemas
│   └── trace_service.py       # Trace persistence
└── embedding_utils.py         # Vector generation
```

---

## Data Flow

### 1️⃣ Authentication Flow

```
User → POST /auth/register (backend-saas)
        │
        ├─ Validate email
        ├─ Hash password
        ├─ Create User (status: inactive)
        └─ Response: {user_id, email}

Admin → POST /auth/activate (backend-saas)
        │
        ├─ Verify admin role
        ├─ Activate user
        └─ Response: {user_id, status: active}

User → POST /auth/login (backend-saas)
        │
        ├─ Validate credentials
        ├─ Generate API Key (wh_xxxxx format)
        ├─ Store key in PostgreSQL
        └─ Response: {api_key, user_data}

User → All subsequent requests
        │
        └─ Header: X-API-Key: wh_xxxxx
```

### 2️⃣ Onboarding Flow (Data Ingestion)

```
User → POST /onboarding/tenant (backend-saas)
        │
        ├─ Validate API Key
        ├─ Create/Update Tenant in PostgreSQL
        └─ Response: {tenant_id, status}

User → POST /onboarding/upload (backend-saas)
        │
        ├─ Validate API Key & file
        ├─ Store PDFs/TXTs in /uploads directory
        └─ Response: {upload_ids}

Backend-saas → POST /onboarding/ingest (backend-agents)
        │
        ├─ Process documents
        ├─ Generate chunks with LLM
        ├─ Create embeddings (Ollama)
        ├─ Store vectors in Qdrant
        └─ Response: {ingestion_status}

User → GET /onboarding/status/{tenant_id} (backend-saas)
        │
        ├─ Verify data in PostgreSQL
        ├─ Check vectors in Qdrant
        └─ Response: {status, chunks_count, vectors_count}
```

### 3️⃣ Agent Execution Flow (Query Processing)

```
User → POST /agent/execute (backend-saas:8000)
        │ X-API-Key: wh_xxxxx
        │ {query, tenant_id, enable_detailed_trace}
        │
        ├─ Validate API Key
        ├─ Verify tenant access (tenant isolation)
        └─ ProxyClient.forward() → backend-agents:8001
                │
                └─ POST /agent/execute (backend-agents:8001)
                        │
                        ├─ [RAG Node]
                        │  ├─ Embed query (Ollama)
                        │  ├─ Search Qdrant for context
                        │  └─ Return top-k results
                        │
                        ├─ [Planner Node]
                        │  ├─ Build prompt (query + context)
                        │  ├─ LLM call (Ollama or OpenRouter)
                        │  └─ Parse response
                        │
                        ├─ [Decision Node]
                        │  ├─ Evaluate: need more search?
                        │  └─ Route: finish or loop back
                        │
                        └─ [Persist Node]
                           ├─ Store trace in PostgreSQL
                           ├─ Calculate metrics
                           └─ Return AgentResponse

← Response to User
  {
    trace_id: "abc123",
    query: "...",
    result: [{role: "assistant", content: "..."}],
    iterations: 2,
    metadata: {...},
    total_duration_ms: 1850
  }
```

### 4️⃣ Vector Database (RAG) Flow

```
Documents → /onboarding/ingest (backend-agents)
            │
            ├─ Split into chunks (semantic segmentation)
            ├─ Generate embeddings (nomic-embed-text)
            └─ Store in Qdrant with metadata:
                {
                  id: "chunk_123",
                  vector: [0.23, 0.45, ...],  # embedding
                  payload: {
                    tenant_id: "clinic-x",
                    source: "file_name.pdf",
                    text: "actual chunk content",
                    page: 5
                  }
                }

Query → POST /agent/execute
        │
        ├─ Embed query (same model: nomic-embed-text)
        ├─ Search Qdrant: similarity_search(
        │    vector=query_embedding,
        │    filter={tenant_id: "clinic-x"},
        │    limit=5
        │  )
        └─ Return top-5 similar chunks
```

---

## Design Patterns

### 1. API Gateway Pattern

**Backend-saas** acts as the single entry point. It:
- Validates all requests (authentication, authorization)
- Enforces tenant isolation
- Routes requests to backend-agents transparently
- Handles rate limiting, CORS, logging
- Persists audit trails

**Benefit:** Clients only know about backend-saas. Backend-agents is internal.

### 2. Proxy Pattern

```python
# backend-saas/routers/agent_proxy_router.py
async def proxy_execute(
    req: AgentRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    proxy: ProxyClient = Depends(get_proxy_client),
):
    # 1. Validate user & tenant
    # 2. Forward to backend-agents
    result = await proxy.forward(
        "POST",
        "/agent/execute",
        json=req.model_dump(),
        headers={"X-API-Key": api_key, "X-Trace-Id": trace_id}
    )
    # 3. Return response
    return result
```

### 3. Dependency Injection

**FastAPI Depends()** is used throughout:
- `get_current_user()` - validates API Key
- `get_proxy_client()` - provides HTTP proxy instance
- `get_agent_tenant()` - validates tenant from API Key
- `get_db()` - database connection

**Benefit:** Testable, loosely coupled, easy to mock.

### 4. Pydantic Models for Validation

All requests/responses use Pydantic **BaseModel** with **Field()** constraints:

```python
class AgentRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=2000)
    tenant_id: Optional[str] = None
    enable_detailed_trace: bool = False
    max_iterations: int = Field(5, ge=1, le=10)
    temperature: float = Field(0.7, ge=0.0, le=2.0)
```

**Benefit:** Type safety, validation, Swagger auto-docs.

### 5. Structured Logging (JSON)

All logs use `logger.info(msg, extra={...})` format:

```python
logger.info(
    "Agent execution completed",
    extra={
        "trace_id": trace_id,
        "tenant_id": tenant_id,
        "iterations": 3,
        "duration_ms": 1850,
        "success": True
    }
)
```

**Benefit:** Machine-readable, searchable, perfect for centralized logging (ELK, Datadog).

### 6. Factory Pattern for LLM Providers

```python
# backend-agents/app/llm/factory.py
def get_llm_provider() -> BaseLLMProvider:
    provider = os.getenv("LLM_PROVIDER", "ollama")

    if provider == "ollama":
        return OllamaProvider()
    elif provider == "openrouter":
        return OpenRouterProvider()
    else:
        raise ValueError(f"Unknown provider: {provider}")
```

**Benefit:** Pluggable LLM providers, easy to switch at runtime.

---

## Database Design

### PostgreSQL Schema (Shared)

```sql
-- Users (Authentication)
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(255),
    rol VARCHAR(50),  -- 'cliente', 'analista', 'admin', 'superadmin'
    tenant_id VARCHAR(255),
    api_key VARCHAR(255) UNIQUE,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tenants (Multi-tenancy)
CREATE TABLE tenants (
    id VARCHAR(255) PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    industria VARCHAR(100),
    descripcion TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Traces (Agent Execution History)
CREATE TABLE traces (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) REFERENCES tenants(id),
    query TEXT NOT NULL,
    result TEXT,
    iterations INTEGER,
    total_duration_ms INTEGER,
    metadata JSONB,
    success BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Metrics (Performance Aggregates)
CREATE TABLE agent_metrics (
    id UUID PRIMARY KEY,
    tenant_id VARCHAR(255) REFERENCES tenants(id),
    avg_iterations FLOAT,
    avg_duration_ms FLOAT,
    total_executions INTEGER,
    error_count INTEGER,
    success_rate FLOAT,
    last_execution TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tenant Configuration
CREATE TABLE tenant_config (
    id UUID PRIMARY KEY,
    tenant_id VARCHAR(255) REFERENCES tenants(id),
    nombre_empresa VARCHAR(255),
    servicios JSONB,
    sedes JSONB,
    coberturas JSONB,
    routing_rules JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Qdrant Schema (Vector Database)

```yaml
collections:
  knowledge_base:
    vector_size: 384  # nomic-embed-text dimension
    distance: cosine
    storage_type: in_memory

    points:
      - id: chunk_001
        vector: [0.23, 0.45, 0.67, ...]  # 384 dimensions
        payload:
          tenant_id: "clinic-x"
          source: "documento.pdf"
          page: 5
          text: "chunk content"
          created_at: "2026-04-02T12:34:56Z"
```

**Indexes:**
- Vector index for similarity search
- Tenant ID index for filtering (tenant isolation)
- Source index for document tracking

---

## API Gateway Benefits

✅ **Single Entry Point** - Clients only call backend-saas:8000
✅ **Tenant Isolation** - All requests validated against API Key
✅ **Rate Limiting** - Central control (100 req/min)
✅ **Authentication** - Centralized, consistent
✅ **Audit Trail** - All requests logged
✅ **Scalability** - Backend-agents can scale independently
✅ **Security** - Internal services not exposed
✅ **Versioning** - Easy to version APIs transparently

---

## Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **API Gateway** | FastAPI (Python) | Request routing, validation, auth |
| **AI Engine** | LangGraph | Agent orchestration |
| **LLM (Local)** | Ollama | Running models locally |
| **LLM (Cloud)** | OpenRouter | Cloud LLM alternatives |
| **Vector DB** | Qdrant | Semantic search, RAG |
| **Relational DB** | PostgreSQL | Users, tenants, traces |
| **Cache/Queue** | Redis | Rate limiting, session cache |
| **Frontend** | Next.js 16 | Web UI |
| **IaC** | Docker Compose | Local & production deployment |

---

## Security Model

```
┌─────────────────────────────────────────────────────┐
│ API Key (X-API-Key: wh_xxxxx)                       │
│ ├─ Generated on login                               │
│ ├─ Stored in PostgreSQL (hashed)                    │
│ ├─ Validated on every request                       │
│ └─ User role determined from API Key                │
│                                                      │
│ Role-Based Access Control (RBAC)                    │
│ ├─ cliente: own tenant only                         │
│ ├─ analista: all tenants                            │
│ ├─ admin: full control                              │
│ └─ superadmin: system control                       │
│                                                      │
│ Tenant Isolation                                     │
│ ├─ Every query validated against tenant_id          │
│ ├─ RAG filters by tenant_id (Qdrant payload)        │
│ ├─ Traces tagged with tenant_id                     │
│ └─ No cross-tenant data access possible             │
│                                                      │
│ Rate Limiting                                        │
│ ├─ 100 requests/minute per IP (slowapi)             │
│ └─ Configurable per environment                     │
└─────────────────────────────────────────────────────┘
```

---

**Status:** ✅ Production Ready
**Last Updated:** 2026-04-02
**Reviewed By:** Agencia B2B Dev Team
