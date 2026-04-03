PROMPT SWAGGER - webshooks.com
==============================

Generá la documentación OpenAPI/Swagger completa para webshooks.com.

INSTRUCCIONES
=============
1. Cubre AMBOS backends:
   - backend-saas:8000
   - backend-agents:8001

2. Para CADA endpoint incluí:
   - Descripción clara
   - Parámetros (path, query, body)
   - Responses (200, 400, 401, 403, 500)
   - Ejemplo request/response
   - Security/auth requerida

3. Documentá TODOS los modelos Pydantic:
   - AgentRequest
   - AgentResponse
   - TraceStepType
   - RagResult
   - ErrorResponse
   - OnboardingForm
   - IngestResponse
   - AgentDecision
   - etc.

4. Includí tags para agrupar:
   - Auth
   - Onboarding
   - Tenant
   - Agent
   - Traces
   - Metrics

ENDPOINTS BACKEND-SAAS:8000
==========================

GROUP: Auth
-----------
POST /auth/login
  Summary: Obtener API Key
  Auth: No requerida
  Body: {email, password}
  Response: {api_key, role, tenant_id}
  
POST /auth/validate
  Summary: Validar API Key
  Auth: X-API-Key header
  Response: {valid, role, tenant_id}

GROUP: Onboarding
-----------------
POST /onboarding/ingest
  Summary: Cargar knowledge base del tenant
  Auth: X-API-Key header
  Body: OnboardingForm + documentos
  Response: IngestResponse {chunks_generados, chunks_almacenados, modelo_usado, errores, tiempo_ms}
  Errors: 400 (invalid form), 401 (auth), 503 (service unavailable)

GROUP: Tenant
-------------
GET /tenant/me
  Summary: Obtener datos del tenant actual
  Auth: X-API-Key header
  Response: {tenant_id, nombre, industria, coberturas, sedes, servicios}

PUT /tenant/update
  Summary: Actualizar tenant metadata
  Auth: X-API-Key header
  Body: {nombre?, descripcion?, config?}
  Response: {tenant_id, nombre, updated_at}

GET /health
  Summary: Health check
  Auth: No requerida
  Response: {status: "ok"}

ENDPOINTS BACKEND-AGENTS:8001
=============================

GROUP: Agent
-----------
POST /agent/execute
  Summary: Ejecutar query con RAG context
  Auth: X-API-Key header REQUIRED
  Body: AgentRequest {
    query: str (1-1000 chars),
    tenant_id: str (pattern: ^tenant_[a-z0-9_]+$),
    max_iterations: int (1-10, default 5),
    user_id?: str,
    conversation_id?: str
  }
  Response: AgentResponse {
    trace_id: str (UUID),
    tenant_id: str,
    query: str,
    iterations: int,
    result: [{role: "assistant", content: str}],
    metadata: {
      rag_hits_count: int,
      finish_reason: str (results_found|max_iterations|error),
      embedding_ms: int,
      rag_ms: int,
      llm_ms: int,
      total_duration_ms: int
    },
    timestamp: datetime
  }
  Errors: 401 (auth), 403 (tenant access), 503 (service error)

GROUP: Traces
-------------
GET /agent/traces
  Summary: Listar traces de un tenant
  Auth: X-API-Key header REQUIRED
  Query params:
    - tenant_id: str (required)
    - limit: int (1-100, default 50)
    - offset: int (default 0)
  Response: [{trace_id, tenant_id, query, iterations, finish_reason, created_at, ...}]

GET /agent/traces/{trace_id}
  Summary: Obtener trace específico
  Auth: X-API-Key header REQUIRED
  Path params:
    - trace_id: str (UUID)
  Response: {
    trace_id, tenant_id, query, iterations, result, rag_context,
    metadata, embedding_ms, rag_ms, llm_ms, total_ms, finish_reason,
    created_at, updated_at
  }

GROUP: Metrics
--------------
GET /metrics/agent
  Summary: Métricas del agent por tenant
  Auth: X-API-Key header REQUIRED
  Query params:
    - tenant_id: str (required)
    - period: str (day|week|month, default week)
  Response: {
    tenant_id, period, total_queries, avg_iterations, avg_duration_ms,
    results_found_pct, rag_hits_avg, finish_reasons: {results_found: int, error: int, ...}
  }

GET /health
  Summary: Health check
  Auth: No requerida
  Response: {status: "ok"}

MODELOS PYDANTIC
================

AgentRequest
  query: str (min_length=1, max_length=1000)
  tenant_id: str (pattern=^tenant_[a-z0-9_]+$)
  user_id?: str
  conversation_id?: str
  max_iterations: int (ge=1, le=10, default=5)

AgentResponse
  trace_id: str
  tenant_id: str
  query: str
  iterations: int
  result: List[{role: str, content: str}]
  metadata: {
    rag_hits_count: int,
    finish_reason: str,
    embedding_ms: int,
    rag_ms: int,
    llm_ms: int,
    total_duration_ms: int
  }
  timestamp: datetime

RagResult
  id: int
  score: float (0.0-1.0)
  text: str
  category?: str
  entity?: str
  source?: str

TraceStepType (enum)
  EMBEDDING
  RAG_SEARCH
  LLM_CALL
  AGENT_DECISION

TraceStep
  step_type: TraceStepType
  step_number: int
  duration_ms: int
  input_data?: dict
  output_data?: dict
  error?: str
  timestamp: datetime

ErrorResponse
  error: str
  error_code: str (401, 403, 500, etc)
  details?: str
  timestamp: datetime

OnboardingForm
  tenant_id: str
  tenant_nombre: str
  industria: str
  subcategoria: str
  descripcion_corta: str
  proposito_principal: str
  acciones_habilitadas: List[str]
  acciones_prohibidas: List[str]
  tono: str
  mensaje_fallback: str
  coberturas: List[str]
  sedes: List[{nombre, direccion, telefonos, mail, horario_semana, horario_sabado}]
  servicios: List[{nombre, descripcion, categoria}]

IngestResponse
  tenant_id: str
  chunks_generados: int
  chunks_almacenados: int
  modelo_usado: str
  errores: List[str]
  tiempo_ms: int

SEGURIDAD
=========
Security Scheme: APIKey
  Type: apiKey
  Name: X-API-Key
  In: header
  Description: API Key en formato wh_xxxxx
  
Roles:
  - admin: Acceso a todos los tenants
  - cliente: Acceso solo a su tenant
  - analista: Acceso read-only a todos

EJEMPLOS
========

POST /agent/execute
-------------------
Request:
{
  "query": "¿Atienden con OSDE?",
  "tenant_id": "tenant_sistema_diagnostico",
  "max_iterations": 5
}

Response 200:
{
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "tenant_id": "tenant_sistema_diagnostico",
  "query": "¿Atienden con OSDE?",
  "iterations": 1,
  "result": [
    {
      "role": "assistant",
      "content": "Sí, atendemos con OSDE. Disponible en Sede Centro y Sede Flores."
    }
  ],
  "metadata": {
    "rag_hits_count": 1,
    "finish_reason": "results_found",
    "embedding_ms": 45,
    "rag_ms": 23,
    "llm_ms": 234,
    "total_duration_ms": 302
  },
  "timestamp": "2026-03-29T20:15:45.123Z"
}

Response 401:
{
  "error": "Unauthorized",
  "error_code": "401",
  "details": "API Key inválida o faltante",
  "timestamp": "2026-03-29T20:15:45.123Z"
}

GET /agent/traces?tenant_id=tenant_sistema_diagnostico&limit=10
Response:
[
  {
    "trace_id": "550e8400-e29b-41d4-a716-446655440000",
    "tenant_id": "tenant_sistema_diagnostico",
    "query": "¿Atienden con OSDE?",
    "iterations": 1,
    "finish_reason": "results_found",
    "created_at": "2026-03-29T20:15:45.123Z"
  },
  ...
]

TAGS
====
Auth - Autenticación y validación de API Keys
Onboarding - Carga de knowledge base
Tenant - Datos y configuración del tenant
Agent - Ejecución de queries con RAG
Traces - Historial de ejecuciones
Metrics - Análisis y métricas
Health - Health checks

IMPLEMENTACION
==============
Los endpoints están documentados automáticamente en FastAPI.
Accedé a la documentación interactiva en:

backend-saas:
  Swagger UI: http://localhost:8000/docs
  ReDoc: http://localhost:8000/redoc
  OpenAPI JSON: http://localhost:8000/openapi.json

backend-agents:
  Swagger UI: http://localhost:8001/docs
  ReDoc: http://localhost:8001/redoc
  OpenAPI JSON: http://localhost:8001/openapi.json

NOTAS
=====
- Todos los timestamps en ISO 8601 format con Z (UTC)
- Todos los requests requieren Content-Type: application/json
- CORS configurado para frontend:3001
- Rate limiting: 100 requests/minute por API Key
- Timeouts: 30s para onboarding, 60s para agent execution
