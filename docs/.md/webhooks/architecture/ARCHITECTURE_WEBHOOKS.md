# ARCHITECTURE — Webshooks Platform

**Versión:** 2.0 — Post-separación arquitectónica  
**Fecha:** 2026-04-03  
**Verificado contra:** código fuente en rama `main`

---

## 1. Visión general

Webshooks es una **plataforma SaaS B2B multi-tenant** que provee agentes de inteligencia artificial configurables por cliente. Su propósito central es que cada empresa (tenant) pueda exponer un agente inteligente que responde preguntas sobre su propio negocio, entrenado con sus propios documentos.

El sistema tiene dos frentes:
- **Un control plane** (backend-saas) que gestiona usuarios, tenants, onboarding y autenticación.
- **Un motor de AI** (backend-agents) que ejecuta los agentes con contexto RAG y LLM.

La separación no es arbitraria — responde a una decisión de escalabilidad y seguridad: el motor de AI consume recursos intensivos (embeddings, inferencia LLM, búsqueda vectorial) y debe poder escalar de forma independiente al control plane.

---

## 2. Diagrama de servicios

```
┌──────────────────────────────────────────────────────────────────┐
│                        CAPA PÚBLICA                              │
│                                                                  │
│   Frontend (Next.js)                 Clientes externos           │
│   localhost:3001 / vercel            curl / SDK / etc            │
└─────────────────────┬────────────────────────┬───────────────────┘
                      │                        │
              X-API-Key header         X-API-Key header
                      │                        │
┌─────────────────────▼────────────────────────▼───────────────────┐
│                 backend-saas :8000                               │
│           (API Gateway + Control Plane)                          │
│                                                                  │
│  /auth/*          → autenticación, API keys                      │
│  /onboarding/*    → creación de tenants, carga de archivos       │
│  /tenant/*        → gestión de tenants                           │
│  /agent/*         → proxy transparente a backend-agents          │
│  /health          → health check con estado de dependencias      │
└─────────────────────────────┬────────────────────────────────────┘
                              │
                   Red interna Docker (app-network)
                   X-API-Key propagado en headers
                              │
┌─────────────────────────────▼────────────────────────────────────┐
│                backend-agents :8001                              │
│          (Motor de AI — NUNCA expuesto externamente)             │
│                                                                  │
│  /agent/execute   → ejecución del grafo LangGraph                │
│  /agent/config    → configuración del agente por tenant          │
│  /agent/traces    → historial de ejecuciones                     │
│  /metrics/agent   → métricas de convergencia                     │
│  /onboarding/ingest → procesamiento e ingestión de documentos    │
└──────────┬───────────────────┬─────────────────┬─────────────────┘
           │                   │                 │
    ┌──────▼──────┐    ┌───────▼──────┐   ┌─────▼──────┐
    │  PostgreSQL │    │    Qdrant    │   │   Ollama   │
    │  (shared)   │    │  (vectors)   │   │   (LLM)    │
    │             │    │              │   │            │
    │ users       │    │ colección    │   │ qwen2.5    │
    │ tenants     │    │ por tenant   │   │ nomic-     │
    │ traces      │    │ isolado      │   │ embed-text │
    └─────────────┘    └──────────────┘   └────────────┘
           │
    ┌──────▼──────┐
    │    Redis    │
    │  (cache +   │
    │ rate limit) │
    └─────────────┘
```

---

## 3. Por qué esta estructura y no otra

### 3.1 La decisión central: separar SaaS de AI Engine

La propuesta original tenía todo en un monolito (`backend-saas` con `engine/`, `tools/`, y endpoints de agente mezclados con auth y onboarding). Se migró a dos servicios separados.

**Razón técnica:** El motor de AI tiene un perfil de recursos completamente distinto al control plane. Hacer embeddings con Ollama, buscar en Qdrant y llamar al LLM son operaciones bloqueantes y pesadas. Mezclarlas con endpoints de auth (que deben responder en < 100ms) degrada la experiencia del usuario autenticado cuando hay carga de AI. Separados, cada servicio puede escalar de forma independiente y con configuraciones de workers distintas.

**Razón de seguridad:** El motor de AI tiene acceso directo a Qdrant y Ollama. Exponerlo públicamente ampliaría la superficie de ataque. Al mantenerlo interno, la única forma de acceder al motor es a través del gateway que valida identidad y permisos.

**Evidencia en el código:** El `docker-compose.prod.yml` usa `expose` (solo red interna) para backend-agents y `ports` (mapeado al host) solo para backend-saas. Esto no es accidental — es la implementación del principio de mínima exposición.

### 3.2 Por qué API Gateway y no llamada directa del frontend

Un diseño alternativo hubiera sido que el frontend llame directamente a backend-agents. La propuesta original incluso lo consideró como "Opción A". Se eligió el proxy por dos razones:

1. **Autenticación centralizada:** El cliente solo necesita conocer un endpoint y una API key. backend-saas valida la identidad antes de que el request llegue al motor. Si el motor quedara expuesto, cada cliente podría intentar abusar de él directamente.

2. **Tenant isolation como responsabilidad del gateway:** La lógica de "¿este usuario puede acceder a este tenant?" vive en backend-saas. Si el cliente llama directo al motor, el aislamiento depende de que el motor también valide — duplicando lógica y abriendo posibilidades de bypass.

**Evidencia en el código:** `proxy_execute` en [agent_proxy_router.py](../../../../../../backend-saas/app/routers/agent_proxy_router.py) valida el rol del usuario y el acceso al tenant antes de hacer el forward. `backend-agents/app/auth/agent_auth.py` valida la API key recibida en el header propagado — doble capa de validación.

### 3.3 Por qué colección por tenant en Qdrant y no filtro por campo

El aislamiento vectorial se implementa con una colección Qdrant separada por tenant (prefijo `tenant_<id>`), no con una colección compartida filtrada por `tenant_id` en el payload.

**Razón:** Con una colección compartida, un error en el filtro expone datos de un tenant a otro. Con colecciones separadas, el aislamiento es estructural — imposible de romper por lógica de aplicación. La función `_normalize_tenant_id()` en [qdrant/client.py](../../../../../../backend-agents/app/qdrant/client.py) convierte el tenant_id a un nombre de colección seguro para Qdrant (solo alfanumérico + guiones bajos).

### 3.4 Por qué LangGraph y no una cadena de llamadas simples

El agente podría haberse implementado como una función que llama RAG, luego llama LLM, y retorna. Se eligió LangGraph porque el proceso es iterativo: el agente puede decidir buscar más información, ejecutar tools, y eventualmente finalizar. LangGraph modela esto como un grafo de estados con transiciones condicionales.

**La lógica determinista de terminación** (en `should_finish()`) corre **antes** del LLM en cada iteración, ahorrando tokens cuando el resultado ya es suficiente. Este es un detalle de optimización que no hubiera sido posible sin la estructura de grafo: el nodo planner puede decidir finalizar sin llamar al LLM si `actionable_results_count > 0` y ya se completó al menos una iteración.

---

## 4. Estructura de archivos verificada

### 4.1 backend-saas

```
backend-saas/
├── Dockerfile
├── requirements.txt
├── app/
│   ├── main.py                      → FastAPI app, CORS, routers, health
│   ├── auth_router.py               → /auth/register, /auth/login, /auth/activate
│   ├── auth_service.py              → lógica de hashing, API key generation
│   ├── auth_models.py               → Pydantic: RegisterRequest, LoginResponse
│   ├── onboarding_router.py         → /onboarding/tenant, /upload, /ingest, /status
│   ├── onboarding_service.py        → procesamiento de archivos, chunking, embeddings
│   ├── onboarding_models.py         → Pydantic: TenantCreate, UploadResponse
│   ├── tenant_router.py             → /tenant/, /tenant/{id}
│   ├── tenant_models.py             → Pydantic: TenantResponse, TenantUpdate
│   ├── db/
│   │   ├── models.py                → esquema PostgreSQL (users, tenants, traces)
│   │   ├── queries.py               → helpers de consulta
│   │   └── trace_service.py         → persistencia de trazas
│   ├── lib/
│   │   ├── proxy_client.py          → ProxyClient httpx para backend-agents
│   │   ├── auth_utils.py            → get_current_user, validación API key
│   │   ├── health_check.py          → chequeo de postgres, qdrant, redis
│   │   ├── exceptions.py            → clases de error custom
│   │   └── logging_utils.py         → logging estructurado JSON
│   ├── models/
│   │   ├── agent_request_model.py   → AgentRequest, AgentResponse, AgentConfigResponse
│   │   └── tracing_context.py       → TracingContext para observabilidad
│   └── routers/
│       └── agent_proxy_router.py    → /agent/execute, /config, /traces, /metrics/agent
```

### 4.2 backend-agents

```
backend-agents/
├── Dockerfile
├── requirements.txt
├── app/
│   ├── main.py                      → FastAPI app, endpoints del motor
│   ├── models.py                    → AgentRequest, AgentResponse, TraceStepType
│   ├── onboarding_models.py         → IngestRequest, IngestResponse
│   ├── onboarding_router.py         → /onboarding/ingest
│   ├── onboarding_service.py        → chunking, embeddings, upsert en Qdrant
│   ├── embedding_utils.py           → text_to_embedding() via Ollama
│   ├── auth/
│   │   └── agent_auth.py            → validación X-API-Key contra PostgreSQL
│   ├── db/
│   │   └── trace_service.py         → persistencia de AgentTrace en PostgreSQL
│   ├── engine/
│   │   ├── planner.py               → grafo LangGraph, nodos, run_agent()
│   │   ├── state.py                 → AgentDecision, AgentState (GraphState)
│   │   ├── adapters.py              → RagRetriever, OllamaAdapter, RegistryAdapter
│   │   ├── prompts.py               → build_prompt(), templates del sistema
│   │   └── langgraph_engine.py      → LangGraphEngine wrapper
│   ├── llm/
│   │   ├── factory.py               → get_llm_provider() por env var
│   │   ├── ollama_provider.py       → OllamaProvider (local)
│   │   └── openrouter_provider.py   → OpenRouterProvider (cloud + key rotation)
│   ├── qdrant/
│   │   └── client.py                → tenant_scoped_search(), colección por tenant
│   ├── routers/
│   │   └── rag.py                   → /rag/search (debug)
│   └── tools/
│       ├── registry.py              → REGISTRY de tools disponibles
│       ├── rag.py                   → tool de búsqueda RAG
│       └── scrape.py                → tool de scraping web
```

---

## 5. Flujos principales

### 5.1 Autenticación

```
POST /auth/register
  → hash password (bcrypt/passlib)
  → INSERT users (status=inactive)
  → retorna user_id

POST /auth/activate (admin only)
  → UPDATE users SET is_active=true

POST /auth/login
  → valida password
  → genera api_key = "wh_" + secrets.token_urlsafe(32)
  → INSERT/UPDATE en users.api_key
  → retorna api_key

Todos los requests siguientes:
  → Header: X-API-Key: wh_xxxxx
  → get_current_user() → SELECT users WHERE api_key = hash(X-API-Key)
```

**Nota de diseño:** La API key no es un JWT. Es un token opaco almacenado en PostgreSQL. Esto permite revocarla en tiempo real (borrando el registro) sin tiempo de expiración ni gestión de firma. El trade-off es que cada request hace una consulta a la base de datos para validar.

### 5.2 Onboarding (ingesta de conocimiento)

```
POST /onboarding/tenant   → crea tenant en PostgreSQL
POST /onboarding/upload   → guarda archivos en /uploads/
POST /onboarding/ingest   → llama internamente a backend-agents/onboarding/ingest
                              ↳ lee archivos de /uploads/ (volumen compartido)
                              ↳ extrae texto (PDF, TXT, XLSX)
                              ↳ divide en chunks semánticos
                              ↳ genera embeddings via Ollama (nomic-embed-text)
                              ↳ upsert en Qdrant colección "tenant_<id>"
GET /onboarding/status    → cuenta documentos en PostgreSQL + vectores en Qdrant
```

**El volumen compartido** `/uploads/` es montado en modo `:rw` en backend-saas y `:ro` en backend-agents. Esto permite que el usuario suba archivos a backend-saas y el motor los lea durante la ingestión, sin HTTP entre servicios para transferencia de archivos.

### 5.3 Ejecución del agente

```
POST /agent/execute (backend-saas:8000)
  1. get_current_user()  → valida API key
  2. tenant_access check → rol admin puede acceder a cualquier tenant;
                           rol cliente solo al propio
  3. proxy.forward() → POST backend-agents:8001/agent/execute
                         con X-API-Key propagado

  backend-agents recibe la request:
  4. agent_auth.get_agent_tenant() → valida API key contra PostgreSQL
  5. run_agent(task, tenant_id, rag_retriever, llm_provider, tool_registry)

     Grafo LangGraph:
     [rag_node] → embeds query → busca en Qdrant con filtro tenant
     [planner_node] → should_finish()? (determinístico, sin LLM)
                    → si no: build_prompt(task, context, history, tools)
                    → llm_provider.complete(system, messages)
                    → parsea JSON de respuesta
                    → decide: action = "search" | "scrape" | "none"
     [tool_executor_node] → ejecuta tool si action != "none"
     [planner_node] → itera hasta is_finished=True o MAX_ITERATIONS=5

  6. persist_trace() → guarda en PostgreSQL con métricas
  7. retorna AgentResponse con messages, metadata, trace_id
```

### 5.4 Aislamiento multi-tenant en Qdrant

```python
# backend-agents/app/qdrant/client.py

def _normalize_tenant_id(tenant_id: str) -> str:
    # "clinica-x Buenos Aires" → "tenant_clinica_x_buenos_aires"
    normalized = re.sub(r"[^a-z0-9]", "_", tenant_id.lower().strip())
    return f"{COLLECTION_PREFIX}_{normalized}"

async def tenant_scoped_search(tenant_id, vector, limit=5):
    collection_name = _normalize_tenant_id(tenant_id)
    response = client.query_points(collection_name=collection_name, ...)
```

Cada tenant tiene su propia colección. No existe un filtro de payload que pueda "olvidarse". El aislamiento es estructural.

---

## 6. Patrones de diseño en uso

### Factory para LLM providers

```python
# backend-agents/app/llm/factory.py
def get_llm_provider():
    provider_name = settings.llm_provider.lower()  # de env var LLM_PROVIDER
    if provider_name == "ollama":
        return OllamaProvider()
    elif provider_name == "openrouter":
        return OpenRouterProvider()
```

El motor no sabe qué LLM está usando. Recibe un `LLMProvider` abstracto con el método `complete(system_prompt, messages)`. Cambiar de Ollama a OpenRouter es cuestión de una variable de entorno, sin tocar el grafo.

### Terminación determinista antes del LLM

```python
# backend-agents/app/engine/planner.py
def should_finish(state: GraphState) -> bool:
    if state["iterations"] >= MAX_ITERATIONS:           return True
    if state["actionable_results_count"] > 0            # resultados con herramientas
       and state["iterations"] >= 1:                    return True
    if len(executed) >= 2 and executed[-1] == executed[-2]:  # loop detection
                                                        return True
    if "scrape" in executed and not _task_has_url(task): return True
    return False
```

Este chequeo corre **antes** de llamar al LLM. Si el sistema ya tiene resultados suficientes, no gasta tokens en una llamada adicional.

### Proxy transparente con propagación de headers

```python
# backend-saas/app/routers/agent_proxy_router.py
trace_id = request.headers.get("X-Trace-Id")
api_key = request.headers.get("X-API-Key")
headers = {}
if trace_id:  headers["X-Trace-Id"] = trace_id
if api_key:   headers["X-API-Key"] = api_key

result = await proxy.forward("POST", "/agent/execute",
    json=req.model_dump(exclude_none=True), headers=headers)
```

El cliente envía `X-Trace-Id` para correlacionar logs. backend-saas lo propaga a backend-agents. Ambos servicios loguean con el mismo `trace_id`, permitiendo rastrear un request a través de los dos servicios.

---

## 7. Modelo de datos

### PostgreSQL (tablas confirmadas en código fuente)

```sql
-- Autenticación y roles
users (
    id, email, password_hash, nombre,
    rol,        -- 'cliente' | 'analista' | 'admin' | 'superadmin'
    tenant_id,  -- FK a tenants
    api_key,    -- "wh_" + token
    is_active,
    created_at, updated_at
)

-- Multi-tenancy
tenants (
    id,         -- slug del negocio, e.g. "clinica-x-buenos-aires"
    nombre, industria, descripcion,
    config,     -- JSONB: tono, mensaje_fallback, reglas
    created_by, created_at, updated_at
)

-- Trazas del motor de AI
agent_request_traces (
    id,         -- trace_id UUID
    tenant_id,
    user_id,
    query,      -- consulta original
    result,     -- respuesta del agente
    iterations,
    total_duration_ms,
    metadata,   -- JSONB: model, finish_reason, rag_hits, tools_executed
    success,
    created_at
)
```

### Qdrant (colecciones por tenant)

```
Colección: tenant_<normalized_id>
  Dimensión: 768 (nomic-embed-text)
  Métrica: cosine

  Cada punto:
  {
    id: UUID,
    vector: [float × 768],
    payload: {
      text: "contenido del chunk",
      source: "nombre_archivo.pdf",
      page: número (si aplica),
      tenant_id: "clinica-x"  (redundante, para debug)
    }
  }
```

---

## 8. Seguridad

| Capa | Mecanismo | Ubicación |
|------|-----------|-----------|
| Autenticación | X-API-Key validada contra PostgreSQL | `lib/auth_utils.py`, `auth/agent_auth.py` |
| Autorización | RBAC: cliente solo accede a su tenant | `agent_proxy_router.py` L.118-123 |
| Aislamiento de datos | Colección Qdrant por tenant | `qdrant/client.py` |
| Exposición de red | backend-agents solo en red interna | `docker-compose.prod.yml` (expose vs ports) |
| Rate limiting | slowapi en backend-saas | `main.py` |
| Propagación de contexto | X-Trace-Id en todos los hops | headers en proxy |

---

## 9. Stack tecnológico (verificado)

| Componente | Tecnología | Versión/Modelo |
|------------|-----------|----------------|
| Control plane | FastAPI (Python) | — |
| Motor de AI | FastAPI + LangGraph | — |
| LLM local | Ollama | qwen2.5:0.5b, gemma3 |
| LLM cloud | OpenRouter | Claude 3.5, GPT-4o |
| Embeddings | Ollama | nomic-embed-text |
| Vector DB | Qdrant | latest |
| Relational DB | PostgreSQL | 16-alpine |
| Cache | Redis | 7-alpine |
| Frontend | Next.js | — |
| Orquestación | Docker Compose | — |

---

## 10. Deuda técnica conocida

| Ítem | Severidad | Descripción |
|------|-----------|-------------|
| Conexiones DB sin pool | Media | `planner.py` abre y cierra `psycopg2.connect()` en cada ejecución del agente. En producción con carga debería usarse `asyncpg` con pool. |
| URL de Qdrant hardcodeada en adapters.py | Baja | `OLLAMA_BASE_URL = "http://localhost:11434"` en `adapters.py` L.16 — `OllamaAdapter` ignora la env var. Solo se usa en el path de `adapters.py`, el path activo usa `ollama_client.py` que sí lee de env. |
| Groq no implementado | Info | `factory.py` declara soporte para Groq pero lanza `NotImplementedError`. |
| `onboarding_router.py` duplicado | Media | Existe en `backend-saas/app/` y en `backend-agents/app/`. La ingestión debería vivir solo en backend-agents. |

---

*Documento elaborado combinando documentación existente + verificación directa del código fuente en rama `main`, 2026-04-03.*