# PROPUESTA DE SEPARACIÓN ARQUITECTÓNICA
## backend-saas vs backend-agents

**Generado:** 2026-03-29  
**Basado en:** Análisis del código actual

---

## 📊 ESTADO ACTUAL (ACOPLADO)

```
backend-saas/app/
├── main.py                          (396 LOC - MIXTO)
│   ├── /health
│   ├── /agent/execute              ← ❌ AI/RAG logic aquí
│   ├── /agent/traces               ← ❌ AI tracing aquí
│   ├── /metrics/agent              ← ❌ AI metrics aquí
│   ├── /tenant/me                  ← ✓ SaaS
│
├── engine/                          (🔴 100% AI/RAG)
│   ├── langgraph_engine.py         ← LangGraph orchestration
│   ├── planner.py                  ← Core agent loop
│   ├── adapters.py                 ← RAG, Ollama, Tool adapters
│   ├── prompts.py                  ← Agent prompts
│   └── state.py                    ← Agent state
│
├── tools/                           (🔴 100% AI/RAG)
│   ├── rag.py                      ← Qdrant search
│   └── registry.py                 ← Tool execution
│
├── auth_router.py                  (✓ SaaS - auth)
├── auth_service.py                 (✓ SaaS - auth)
├── onboarding_router.py            (✓ SaaS - onboarding)
├── onboarding_service.py           (✓ SaaS - onboarding + embeddings)
├── db/                             (✓ SaaS - shared traces)
└── ...
```

**PROBLEMA:** 
- `engine/` y `tools/` son 100% AI, pero viven en `backend-saas`
- `main.py` mezcla endpoints de SaaS con endpoints de agent
- Difícil de testear, desplegar y escalar por separado

---

## ✅ PROPUESTA: SEPARACIÓN CLARA

```
backend-saas/                       ← SaaS Platform (Multi-tenant, Billing, Auth)
├── app/
│   ├── main.py                    (NEW: ~150 LOC - SOLO SaaS)
│   │   ├── /health
│   │   ├── /auth/*
│   │   ├── /onboarding/*
│   │   ├── /tenant/me
│   │
│   ├── auth_router.py             ✓ SaaS auth
│   ├── auth_service.py            ✓ SaaS auth logic
│   ├── onboarding_router.py       ✓ Onboarding (knowledge base ingestion)
│   ├── onboarding_service.py      ✓ Onboarding + embeddings generation
│   │
│   ├── db/
│   │   ├── models.py              ✓ User, Tenant, Company models
│   │   └── queries.py             ✓ DB helpers
│   │
│   ├── lib/
│   │   ├── auth_utils.py          ✓ Auth helpers
│   │   └── logging_utils.py       ✓ Logging
│   │
│   └── models.py                  ✓ SaaS request/response models
│
├── requirements.txt               (fastapi, psycopg2, pydantic, etc)
├── docker-compose.yml
└── Dockerfile


backend-agents/                     ← AI Agent Engine (LangGraph + RAG)
├── app/
│   ├── main.py                    (NEW: ~200 LOC - SOLO Agent)
│   │   ├── /health
│   │   ├── /agent/execute        ← Agent execution
│   │   ├── /agent/traces         ← Agent traces
│   │   ├── /metrics/agent        ← Agent metrics
│   │
│   ├── engine/                    🔴 MOVIDO ACOMPLETO
│   │   ├── langgraph_engine.py
│   │   ├── planner.py
│   │   ├── adapters.py
│   │   ├── prompts.py
│   │   └── state.py
│   │
│   ├── tools/                     🔴 MOVIDO ACOMPLETO
│   │   ├── rag.py
│   │   └── registry.py
│   │
│   ├── qdrant/                    🔴 MOVIDO
│   │   └── client.py
│   │
│   ├── embedding_utils.py         🔴 MOVIDO
│   │
│   ├── db/
│   │   └── trace_service.py       🔴 Agent traces only
│   │
│   ├── auth/
│   │   └── agent_auth.py          ← Agent-specific auth (API keys)
│   │
│   ├── lib/
│   │   ├── logging_utils.py       → puede ser shared via pip package
│   │   └── observability.py       ← Agent tracing
│   │
│   └── models.py                  ← AgentRequest, AgentResponse, TraceStepType
│
├── requirements.txt               (fastapi, langgraph, qdrant, ollama, psycopg2)
├── docker-compose.yml
└── Dockerfile
```

---

## 📋 MAPA DE MIGRACIÓN ARCHIVO POR ARCHIVO

### ARCHIVOS A MOVER a backend-agents/

```
backend-saas/app/engine/           → backend-agents/app/engine/
├── langgraph_engine.py            (27 LOC)
├── planner.py                     (393 LOC) ← Core agent logic
├── adapters.py                    (175 LOC) ← RAG, Ollama, Tools
├── prompts.py                     (89 LOC)
└── state.py                       (82 LOC)

backend-saas/app/tools/            → backend-agents/app/tools/
├── rag.py                         (129 LOC)
└── registry.py                    (54 LOC)

backend-saas/app/qdrant/           → backend-agents/app/qdrant/
└── client.py                      (87 LOC)

backend-saas/app/embedding_utils.py → backend-agents/app/
                                   (28 LOC)

backend-saas/app/llm/              → backend-agents/app/llm/
└── ollama_client.py               (63 LOC)
```

### ARCHIVOS A MANTENER EN backend-saas/

```
backend-saas/app/auth_router.py    ✓ SaaS auth (API keys, users)
backend-saas/app/auth_service.py   ✓ SaaS auth logic
backend-saas/app/onboarding_router.py ✓ Knowledge base ingestion
backend-saas/app/onboarding_service.py ✓ Chunk generation + embeddings
backend-saas/app/db/models.py      ✓ User, Tenant, Subscription
backend-saas/app/lib/auth_utils.py ✓ Auth helpers
backend-saas/app/models.py         ✓ SaaS domain models
```

### ARCHIVOS COMPARTIDOS (crear pip package shared)

```
logging_utils.py                   → pip package: webshooks-common
observability.py                   → pip package: webshooks-common
```

---

## 🔌 CAMBIOS EN main.py

### backend-saas/app/main.py (NUEVO)

```python
# ✓ MANTENER
from app.auth_router import router as auth_router
from app.onboarding_router import router as onboarding_router

# ❌ REMOVER
# from app.engine.langgraph_engine import LangGraphEngine
# del endpoint: @app.post("/agent/execute")
# del endpoint: @app.get("/agent/traces")
# del endpoint: @app.get("/metrics/agent")

# ✓ MANTENER
@app.get("/health")
@app.get("/tenant/me")
@app.include_router(auth_router)
@app.include_router(onboarding_router)
```

### backend-agents/app/main.py (NUEVO)

```python
# 🔴 AGREGAR (todo lo de agent)
from app.engine.langgraph_engine import LangGraphEngine
from app.db.trace_service import persist_trace

# 🔴 NEW endpoints
@app.post("/agent/execute")
@app.get("/agent/traces")
@app.get("/metrics/agent")
```

---

## 🔗 COMUNICACIÓN ENTRE SERVICIOS

### Opción A: Direct HTTP Calls (Recomendado)

```
Frontend
  ├── POST /api/auth/login           → backend-saas:8000
  ├── POST /api/leads/ingest         → backend-saas:8000
  ├── POST /api/onboarding/chunks    → backend-saas:8000
  │
  └── POST /api/agent/execute        → backend-agents:8001 (nueva URL)
      └── (lleva X-API-Key validado por backend-saas)

backend-saas (8000)                 backend-agents (8001)
├── /auth/*                         ├── /agent/execute
├── /onboarding/*                   ├── /agent/traces
├── /tenant/me                      └── /metrics/agent
└── [database: PostgreSQL]
```

### Opción B: backend-saas Proxies to backend-agents

```
frontend → backend-saas:8000/api/agent/execute
           └→ [backend-saas internally proxies to backend-agents:8001]
              └→ actual agent execution

(menos recomendado: agrega latencia, acoplamiento)
```

**Usaremos Opción A:** Frontend llama directo a ambos servicios.

---

## 📝 IMPORT CHANGES SUMMARY

### backend-agents/app/engine/adapters.py

```python
# CAMBIOS necesarios:
from app.embedding_utils import text_to_embedding  ✓ (viene con backend-agents)
from app.qdrant.client import tenant_scoped_search ✓ (viene con backend-agents)
from app.tools.registry import REGISTRY            ✓ (viene con backend-agents)

# NO CAMBIA NADA en el contenido del archivo
```

### backend-agents/app/engine/planner.py

```python
# CAMBIOS necesarios:
from app.engine.state import AgentDecision        ✓
from app.models.agent_request_model import TraceStepType ✓

# Hardcoded DSN:
conn = psycopg2.connect("postgresql://...")
# → Cambiar a:
from app.config import DATABASE_URL
conn = psycopg2.connect(DATABASE_URL)
```

### backend-agents/app/main.py

```python
# NUEVO
from app.engine.langgraph_engine import LangGraphEngine
from app.db.trace_service import persist_trace
from app.models import AgentRequest, AgentResponse, ErrorResponse, TraceStepType

# (resto igual al actual)
```

### backend-saas/app/main.py

```python
# REMOVER completamente:
# from app.engine.langgraph_engine import LangGraphEngine
# @app.post("/agent/execute")
# @app.get("/agent/traces")
# @app.get("/metrics/agent")

# MANTENER:
from app.auth_router import router as auth_router
from app.onboarding_router import router as onboarding_router
```

---

## 🧹 LIMPIEZA POST-MIGRACIÓN

```
backend-saas/app/
├── rm -rf engine/                 ✓ (movido a backend-agents)
├── rm -rf tools/                  ✓ (movido a backend-agents)
├── rm -rf qdrant/                 ✓ (movido a backend-agents)
├── rm embedding_utils.py          ✓ (movido a backend-agents)
├── rm llm/ollama_client.py        ✓ (movido a backend-agents)
└── ✓ resto intacto
```

---

## 🚀 BENEFICIOS DE LA SEPARACIÓN

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Desacoplamiento** | ❌ Mezclado | ✅ Limpio |
| **Escalabilidad** | ❌ Escalar ambos juntos | ✅ Escalar agentes independientemente |
| **Testing** | ❌ Difícil aislar agent | ✅ Test agent sin SaaS DB |
| **Deployment** | ❌ Cambios agent afectan SaaS | ✅ Deployments independientes |
| **Performance** | ❌ Memory bloat compartido | ✅ Optimizado por servicio |
| **Monitoring** | ❌ Métrica mezcladas | ✅ Observabilidad separada |
| **Equipos** | ❌ Conflictos en main.py | ✅ Equipos aislados |

---

## 📋 CHECKLIST DE MIGRACIÓN

```
PASO 1: Preparación
[ ] Crear backend-agents/ directorio
[ ] Crear backend-agents/app/ structure

PASO 2: Copiar archivos AI/RAG
[ ] engine/ → backend-agents/app/engine/
[ ] tools/ → backend-agents/app/tools/
[ ] qdrant/ → backend-agents/app/qdrant/
[ ] embedding_utils.py → backend-agents/app/
[ ] llm/ollama_client.py → backend-agents/app/llm/

PASO 3: Crear nuevo main.py en backend-agents
[ ] Copiar @app.post("/agent/execute")
[ ] Copiar @app.get("/agent/traces")
[ ] Copiar @app.get("/metrics/agent")
[ ] Copiar middleware de trace_id

PASO 4: Limpiar backend-saas/app/main.py
[ ] Remover @app.post("/agent/execute")
[ ] Remover @app.get("/agent/traces")
[ ] Remover @app.get("/metrics/agent")
[ ] Remover imports de engine
[ ] Remover imports de tools

PASO 5: Actualizar imports en backend-agents
[ ] agent_auth.py con get_user_by_api_key
[ ] embedding_utils.py imports
[ ] qdrant/client.py imports
[ ] tools/registry.py imports

PASO 6: Environment / Config
[ ] backend-agents/.env (DATABASE_URL, OLLAMA_URL, etc)
[ ] backend-saas/.env (sin referencias a agent)
[ ] docker-compose actualizados

PASO 7: Testing
[ ] Test backend-saas: /auth/*, /onboarding/*
[ ] Test backend-agents: /agent/execute, /agent/traces
[ ] Test cross-service: frontend → ambos servicios

PASO 8: Git
[ ] git add backend-agents/
[ ] git rm backend-saas/app/engine/
[ ] git rm backend-saas/app/tools/
[ ] git commit -m "refactor: separate SaaS from Agent architecture"
```

---

## 🎯 PRÓXIMOS PASOS

1. **Hoy:** Revisar esta propuesta
2. **Mañana:** Ejecutar migración (scripts en siguiente archivo)
3. **Post-migración:** 
   - Tests end-to-end
   - Update CI/CD
   - Deploy en dual VPS

---

**Ventajas:**
- ✅ Arquitectura limpia
- ✅ Escalable independientemente
- ✅ Equipos aislados
- ✅ Deployment flexible
- ✅ Mantenimiento futuro más fácil

