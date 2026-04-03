# 📡 API SPECIFICATION - Webshooks Platform

**Última Actualización:** 2026-04-02
**Version:** 1.0 - Production Ready
**Base URL:** `https://your-domain.com` (Production) | `http://localhost:8000` (Local)

---

## 📋 Tabla de Contenidos

1. [Authentication & Authorization](#authentication--authorization)
2. [Endpoint Groups](#endpoint-groups)
3. [CRUD Operations](#crud-operations)
4. [Swagger Documentation](#swagger-documentation)
5. [Testing & E2E](#testing--e2e)
6. [End-to-End Workflows](#end-to-end-workflows)

---

## Authentication & Authorization

### API Key Authentication

All requests (except `/auth/register` and `/auth/login`) require:

```bash
X-API-Key: wh_xxxxxxxxxxxxxxxx
```

**API Key Format:**
- Prefix: `wh_` (Webshooks)
- Length: 32 characters (base64 encoded)
- Example: `wh_abc123def456ghi789jkl012mno34pqr56stu`

**How to Obtain:**
```bash
# 1. Register user
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "nombre": "John Doe",
    "rol": "cliente",
    "tenant_id": "clinic-x"
  }'

# 2. Admin activates user
curl -X POST http://localhost:8000/auth/activate \
  -H "X-API-Key: wh_admin_key_here" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user_123"}'

# 3. Login to get API Key
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'

# Response:
# {
#   "api_key": "wh_abc123...",
#   "user_id": "user_123",
#   "email": "user@example.com",
#   "rol": "cliente",
#   "tenant_id": "clinic-x"
# }
```

### Role-Based Access Control (RBAC)

| Role | Endpoints | Tenant Access |
|------|-----------|---------------|
| **cliente** | `/agent/*`, `/onboarding/*`, `/tenant/me` | Own tenant only |
| **analista** | All `/auth/*`, `/onboarding/*`, `/tenant/*`, `/agent/*` | All tenants |
| **admin** | All endpoints | Full system control |
| **superadmin** | All endpoints | Full system control + user management |

---

## Endpoint Groups

### 1. Authentication (/auth)

#### POST /auth/register
Create inactive user (no auth required)

```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "recepcionista@clinic.ar",
    "password": "SecurePass123!",
    "nombre": "María García",
    "rol": "cliente",
    "tenant_id": "clinic-buenos-aires"
  }'

# Response (200)
{
  "id": "user_123",
  "email": "recepcionista@clinic.ar",
  "nombre": "María García",
  "rol": "cliente",
  "tenant_id": "clinic-buenos-aires",
  "is_active": false,
  "created_at": "2026-04-02T10:30:00Z"
}

# Errors:
# 400 - Email already exists
# 400 - Missing required fields
# 400 - Invalid email format
```

#### POST /auth/login
Authenticate & get API Key (no auth required)

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "recepcionista@clinic.ar",
    "password": "SecurePass123!"
  }'

# Response (200)
{
  "api_key": "wh_abc123def456ghi789jkl012mno34pqr",
  "user_id": "user_123",
  "email": "recepcionista@clinic.ar",
  "nombre": "María García",
  "rol": "cliente",
  "tenant_id": "clinic-buenos-aires"
}

# Errors:
# 401 - Invalid credentials
# 403 - User not active (admin activation required)
```

#### POST /auth/activate
Activate user (admin/analista only)

```bash
curl -X POST http://localhost:8000/auth/activate \
  -H "X-API-Key: wh_admin_key_here" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user_123"}'

# Response (200)
{
  "id": "user_123",
  "is_active": true,
  "updated_at": "2026-04-02T10:35:00Z"
}

# Errors:
# 403 - Insufficient permissions
# 404 - User not found
```

#### GET /auth/me
Get current user info

```bash
curl -X GET http://localhost:8000/auth/me \
  -H "X-API-Key: wh_user_key_here"

# Response (200)
{
  "id": "user_123",
  "email": "recepcionista@clinic.ar",
  "nombre": "María García",
  "rol": "cliente",
  "tenant_id": "clinic-buenos-aires",
  "is_active": true,
  "api_key": "wh_***" (masked)
}
```

### 2. Onboarding (/onboarding)

#### POST /onboarding/tenant
Create/update tenant configuration

```bash
curl -X POST http://localhost:8000/onboarding/tenant \
  -H "X-API-Key: wh_admin_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "clinic-buenos-aires",
    "tenant_nombre": "Clínica Buenos Aires",
    "industria": "salud",
    "descripcion_corta": "Clínica multiespecialista privada",
    "ubicacion": "Buenos Aires, Argentina",
    "servicios": [
      {"nombre": "Cardiología", "descripcion": "..."},
      {"nombre": "Pediatría", "descripcion": "..."}
    ],
    "sedes": [
      {
        "nombre": "Sede Centro",
        "direccion": "Av. Corrientes 1234",
        "telefonos": ["1123456789"],
        "horario_semana": "Lun-Vier 8:00-20:00"
      }
    ],
    "coberturas": ["OSDE", "Swiss Medical", "Galeno"]
  }'

# Response (200)
{
  "tenant_id": "clinic-buenos-aires",
  "tenant_nombre": "Clínica Buenos Aires",
  "created_at": "2026-04-02T10:40:00Z",
  "status": "created"
}
```

#### POST /onboarding/upload
Upload knowledge base documents (PDF, TXT, CSV)

```bash
curl -X POST http://localhost:8000/onboarding/upload \
  -H "X-API-Key: wh_admin_key_here" \
  -F "tenant_id=clinic-buenos-aires" \
  -F "file1=@documento1.pdf" \
  -F "file2=@documento2.txt" \
  -F "file3=@lista_servicios.csv"

# Response (200)
{
  "tenant_id": "clinic-buenos-aires",
  "uploaded_files": [
    {
      "filename": "documento1.pdf",
      "size_bytes": 245632,
      "upload_id": "upload_001"
    },
    {
      "filename": "documento2.txt",
      "size_bytes": 15234,
      "upload_id": "upload_002"
    },
    {
      "filename": "lista_servicios.csv",
      "size_bytes": 8934,
      "upload_id": "upload_003"
    }
  ],
  "next_step": "POST /onboarding/ingest (backend-agents:8001)"
}

# Constraints:
# - Max 3 files per request
# - Max 50 MB per file
# - Allowed types: PDF, TXT, CSV, Excel
```

#### GET /onboarding/status/{tenant_id}
Check ingestion status & vector index health

```bash
curl -X GET "http://localhost:8000/onboarding/status/clinic-buenos-aires" \
  -H "X-API-Key: wh_admin_key_here"

# Response (200)
{
  "tenant_id": "clinic-buenos-aires",
  "postgresql_status": "healthy",
  "postgresql_tables": {
    "tenants": 1,
    "tenant_config": 1
  },
  "qdrant_status": "healthy",
  "qdrant_collections": {
    "knowledge_base": {
      "points_count": 234,
      "vectors_count": 234,
      "last_updated": "2026-04-02T11:00:00Z"
    }
  },
  "overall_status": "ready"
}

# Possible statuses:
# - "pending" - No data ingested yet
# - "in_progress" - Processing documents
# - "ready" - Fully indexed, ready for queries
# - "error" - Ingestion failed
```

### 3. Agent Execution (/agent)

#### POST /agent/execute
Execute agent with RAG (main endpoint)

```bash
curl -X POST http://localhost:8000/agent/execute \
  -H "X-API-Key: wh_user_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "¿Qué coberturas aceptan en la sede centro?",
    "tenant_id": "clinic-buenos-aires",
    "enable_detailed_trace": false,
    "max_iterations": 5,
    "temperature": 0.7
  }'

# Response (200)
{
  "trace_id": "trace_abc123xyz789",
  "tenant_id": "clinic-buenos-aires",
  "query": "¿Qué coberturas aceptan en la sede centro?",
  "iterations": 2,
  "result": [
    {
      "role": "assistant",
      "content": "En la sede centro aceptamos OSDE, Swiss Medical, Galeno y Medicina Prepaga. Horario de atención: Lun-Vier 8:00-20:00, Sab 9:00-14:00."
    }
  ],
  "metadata": {
    "model": "qwen2.5:0.5b",
    "finish_reason": "finished",
    "rag_results_count": 3,
    "confidence": 0.92
  },
  "timestamp": "2026-04-02T12:34:56Z",
  "total_duration_ms": 1850
}

# Request constraints:
# - query: 3-2000 characters (required)
# - tenant_id: required if not in API Key
# - max_iterations: 1-10 (default 5)
# - temperature: 0.0-2.0 (default 0.7)

# Possible responses:
# 200 - Success
# 400 - Invalid input
# 401 - Invalid API Key
# 403 - No access to tenant
# 502 - Backend-agents unavailable
```

#### GET /agent/config
Get tenant agent configuration

```bash
curl -X GET "http://localhost:8000/agent/config" \
  -H "X-API-Key: wh_user_key_here"

# Response (200)
{
  "tenant_id": "clinic-buenos-aires",
  "nombre": "Clínica Buenos Aires",
  "servicios": [
    "Cardiología",
    "Pediatría",
    "Odontología"
  ],
  "sedes": [
    {
      "nombre": "Sede Centro",
      "direccion": "Av. Corrientes 1234",
      "telefonos": ["1123456789"],
      "horario_semana": "Lun-Vier 8:00-20:00"
    }
  ],
  "coberturas": [
    "OSDE",
    "Swiss Medical",
    "Galeno",
    "Medicina Prepaga"
  ],
  "modelo_ia": "qwen2.5:0.5b",
  "ultimo_entrenamiento": "2026-04-02T10:00:00Z"
}
```

#### GET /agent/traces?limit=50
Get agent execution history

```bash
curl -X GET "http://localhost:8000/agent/traces?limit=10" \
  -H "X-API-Key: wh_user_key_here"

# Response (200)
{
  "traces": [
    {
      "trace_id": "trace_001",
      "query": "¿Qué seguros aceptan?",
      "result": "Aceptamos OSDE, Swiss Medical, Galeno y Medicina Prepaga",
      "iterations": 2,
      "total_duration_ms": 1850,
      "success": true,
      "timestamp": "2026-04-02T12:34:56Z"
    },
    {
      "trace_id": "trace_002",
      "query": "¿Cuál es el horario?",
      "result": "Lun-Vier 8:00-20:00, Sab 9:00-14:00",
      "iterations": 1,
      "total_duration_ms": 920,
      "success": true,
      "timestamp": "2026-04-02T12:33:20Z"
    }
  ],
  "total_count": 145,
  "limit": 10
}

# Query params:
# - limit: 1-100 (default 50)
```

#### GET /agent/metrics/agent
Get agent performance metrics

```bash
curl -X GET "http://localhost:8000/agent/metrics/agent" \
  -H "X-API-Key: wh_user_key_here"

# Response (200)
{
  "tenant_id": "clinic-buenos-aires",
  "avg_iterations": 2.3,
  "avg_duration_ms": 1920,
  "total_executions": 145,
  "error_count": 2,
  "success_rate": 0.986,
  "last_execution": "2026-04-02T12:34:56Z",
  "performance_trend": {
    "last_7_days": {
      "avg_duration_ms": 1850,
      "success_rate": 0.99
    },
    "last_30_days": {
      "avg_duration_ms": 1920,
      "success_rate": 0.986
    }
  }
}
```

### 4. Tenant Management (/tenant)

#### GET /tenant/me
Get current user's tenant profile

```bash
curl -X GET http://localhost:8000/tenant/me \
  -H "X-API-Key: wh_user_key_here"

# Response (200)
{
  "user": {
    "id": "user_123",
    "email": "recepcionista@clinic.ar",
    "nombre": "María García",
    "rol": "cliente",
    "tenant_id": "clinic-buenos-aires"
  },
  "tenant": {
    "id": "clinic-buenos-aires",
    "nombre": "Clínica Buenos Aires",
    "industria": "salud"
  }
}
```

#### GET /health
System health check (no auth required)

```bash
curl -X GET http://localhost:8000/health

# Response (200)
{
  "status": "healthy",
  "timestamp": "2026-04-02T15:30:00Z",
  "dependencies": {
    "postgresql": "healthy",
    "qdrant": "healthy",
    "ollama": "healthy"
  }
}

# Possible statuses:
# - "healthy" - All systems operational
# - "degraded" - Some services slow
# - "unhealthy" - Critical services down
```

---

## CRUD Operations

### Create (POST)

**Create Tenant**
```python
POST /onboarding/tenant
{
  "tenant_id": "clinic-x",
  "tenant_nombre": "Clínica X",
  "industria": "salud",
  ...
}
→ 200 Created
```

**Register User**
```python
POST /auth/register
{
  "email": "user@clinic.ar",
  "password": "SecurePass123!",
  "nombre": "John Doe",
  "rol": "cliente"
}
→ 200 Created
```

### Read (GET)

**Get Tenant Config**
```python
GET /agent/config
→ 200 {tenant_config}
```

**Get Execution Traces**
```python
GET /agent/traces?limit=50
→ 200 [{trace1}, {trace2}, ...]
```

**Get Performance Metrics**
```python
GET /agent/metrics/agent
→ 200 {metrics}
```

### Update (PUT)

Currently no direct PUT endpoints. Updates are via:
- POST /auth/activate (activate user)
- POST /onboarding/tenant (upsert tenant)

### Delete

No DELETE endpoints implemented (safe by design).

---

## Swagger Documentation

### Access Swagger UI

```
Local:      http://localhost:8000/docs
Production: https://your-domain.com/docs
```

**Features:**
- ✅ All endpoints documented with descriptions
- ✅ Request/response examples with healthcare domain
- ✅ Request body schemas with field constraints
- ✅ Error codes documented (400, 401, 403, 502)
- ✅ Authentication setup (Authorize button)
- ✅ Try-it-out functionality
- ✅ Response headers (X-Process-Time, X-Trace-Id)

### Authorize in Swagger UI

1. Click **Authorize** button (top right)
2. In the dialog, paste your API Key: `wh_your_api_key_here`
3. Click **Authorize**
4. All requests will include the `X-API-Key` header

### Generate OpenAPI Schema

```bash
# Swagger JSON
curl http://localhost:8000/openapi.json | jq

# ReDoc documentation
http://localhost:8000/redoc
```

---

## Testing & E2E

### End-to-End Test Script

```bash
# Location: scripts/test-e2e.sh
# Run: ./scripts/test-e2e.sh http://localhost:8000

#!/bin/bash
set -e

BASE_URL=${1:-http://localhost:8000}
echo "Testing Webshooks Platform at $BASE_URL"

# 1. Health Check
echo "✓ Health check..."
curl -s $BASE_URL/health | jq '.status'

# 2. Register User
echo "✓ Register user..."
TEST_EMAIL="test_$(date +%s)@example.com"
curl -s -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"Test123!\",\"nombre\":\"Test User\",\"rol\":\"cliente\"}" \
  | jq '.id'

# 3. Login
echo "✓ Login..."
API_KEY=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"Test123!\"}" \
  | jq -r '.api_key')

echo "✓ API Key: $API_KEY"

# 4. Test /auth/me
echo "✓ Get current user..."
curl -s -X GET $BASE_URL/auth/me \
  -H "X-API-Key: $API_KEY" \
  | jq '.email'

# 5. Health (with auth)
echo "✓ Health check (authenticated)..."
curl -s -X GET $BASE_URL/health \
  -H "X-API-Key: $API_KEY" \
  | jq '.status'

echo ""
echo "✅ ALL TESTS PASSED"
```

### Manual Testing Checklist

- [ ] POST /auth/register → 200 (user created, inactive)
- [ ] POST /auth/activate → 200 (user activated)
- [ ] POST /auth/login → 200 (API key returned)
- [ ] GET /auth/me → 200 (user info)
- [ ] POST /onboarding/tenant → 200 (tenant created)
- [ ] POST /onboarding/upload → 200 (files uploaded)
- [ ] GET /onboarding/status → 200 (ready status)
- [ ] POST /agent/execute → 200 (agent response)
- [ ] GET /agent/config → 200 (config data)
- [ ] GET /agent/traces → 200 (traces array)
- [ ] GET /agent/metrics/agent → 200 (metrics)
- [ ] GET /health → 200 (all dependencies healthy)

### Testing with cURL

```bash
# Basic health check
curl http://localhost:8000/health

# With API Key
curl http://localhost:8000/agent/config \
  -H "X-API-Key: wh_your_key"

# POST with JSON
curl -X POST http://localhost:8000/agent/execute \
  -H "X-API-Key: wh_your_key" \
  -H "Content-Type: application/json" \
  -d '{"query":"test","tenant_id":"clinic-x"}'

# Check response code
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health
```

---

## End-to-End Workflows

### 🔄 Complete Onboarding Workflow

```
┌─────────────────────────────────────────────────────┐
│ ADMIN SETUP                                         │
└─────────────────────────────────────────────────────┘

1. Admin registers admin user
   POST /auth/register
   └─ {email: admin@webshooks.com, rol: admin}

2. Admin self-activates (special case)
   POST /auth/activate
   └─ {user_id: admin_user_id}

3. Admin logs in
   POST /auth/login
   └─ api_key: wh_admin_key

┌─────────────────────────────────────────────────────┐
│ CLIENT ONBOARDING                                   │
└─────────────────────────────────────────────────────┘

1. Admin creates tenant
   POST /onboarding/tenant
   └─ {tenant_id, nombre, servicios, sedes, coberturas}

2. Admin uploads knowledge base
   POST /onboarding/upload
   └─ Files: documento.pdf, lista_servicios.csv

3. Backend-agents processes (async)
   [LLM splits & embeds documents]
   [Vectors stored in Qdrant]
   [Traces stored in PostgreSQL]

4. Admin verifies readiness
   GET /onboarding/status/{tenant_id}
   └─ Status: "ready" ✓

5. Admin creates client user
   POST /auth/register
   └─ {email: user@clinic.ar, rol: cliente, tenant_id}

6. Admin activates client user
   POST /auth/activate
   └─ {user_id}

7. Client logs in
   POST /auth/login
   └─ api_key: wh_client_key

┌─────────────────────────────────────────────────────┐
│ CLIENT USAGE                                        │
└─────────────────────────────────────────────────────┘

1. Client queries agent
   POST /agent/execute
   └─ {query, tenant_id}
   └─ Response: {result, traces, metadata}

2. Client checks history
   GET /agent/traces

3. Client views performance
   GET /agent/metrics/agent

4. Client gets config
   GET /agent/config
```

### 📊 Query Processing Workflow

```
User Query
    ↓
┌─────────────────────────────────┐
│ POST /agent/execute             │
│ (backend-saas:8000)             │
└──────────────┬──────────────────┘
               │
    ┌──────────┴──────────┐
    │ Validate:           │
    │ - API Key          │
    │ - Tenant Access    │
    │ - Rate Limit       │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │ ProxyClient.forward │
    │  to backend-agents  │
    └──────────┬──────────┘
               │
        POST /agent/execute
        (backend-agents:8001)
               │
    ┌──────────▼──────────┐
    │ RAG Node:           │
    │ - Embed query       │
    │ - Search Qdrant     │
    │ - Get context       │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │ Planner Node:       │
    │ - Build prompt      │
    │ - Call LLM          │
    │ - Parse response    │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │ Decision Node:      │
    │ - Need more info?   │
    │ - Loop or finish?   │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │ Persist Node:       │
    │ - Store trace       │
    │ - Calculate metrics │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │ AgentResponse       │
    │ - trace_id          │
    │ - result            │
    │ - metadata          │
    └──────────┬──────────┘
               │
               ↓
    Response to User
```

---

## Common Patterns

### Tenant Isolation Verification

Every request includes tenant validation at 3 levels:

```python
# Level 1: API Key validation
current_user = get_current_user(api_key)
→ Returns: {user_id, tenant_id, rol}

# Level 2: Explicit tenant_id check
if tenant_id != current_user["tenant_id"]:
    raise HTTPException(403, "No access to this tenant")

# Level 3: RAG isolation
qdrant_search(query_vector, filter={tenant_id: current_user["tenant_id"]})
→ Only returns vectors for this tenant
```

### Error Response Format

```json
{
  "detail": "Error message here",
  "status_code": 400,
  "request_id": "trace_xyz789",
  "timestamp": "2026-04-02T15:30:00Z"
}
```

### Headers in Responses

```
X-Process-Time: 0.1234s      # Request duration
X-Trace-Id: trace_xyz789     # For distributed tracing
X-RateLimit-Remaining: 99    # Rate limit info
```

---

## API Versioning Strategy

**Current:** v1.0 (default)

Future versions will be supported via:
```
GET /v2/agent/execute (future)
GET /v1/agent/execute (current, default)
```

**Backwards Compatibility:** ✅ All changes are additive. No breaking changes planned.

---

**Status:** ✅ Production Ready
**Last Updated:** 2026-04-02
**Swagger UI:** `http://localhost:8000/docs`
**OpenAPI Schema:** `http://localhost:8000/openapi.json`
