CLAUDE.md - GUÍA MINIMALISTA webshooks.com
===========================================

ARQUITECTURA
============
backend-saas:8000               backend-agents:8001
- /auth/*                       - /agent/execute
- /onboarding/tenant            - /agent/traces, /metrics/agent
- /onboarding/upload            - /onboarding/ingest (LLM + Qdrant)
- /onboarding/status            
- PostgreSQL (Users, Tenants)   - Qdrant (vectores)
- auth_service.py               - engine/ (LangGraph)
- onboarding_service.py         - auth/agent_auth.py (DB Postgres Unificada)

NUNCA HACER
===========
1. Especular código - pedir ver primero
2. Hardcoding - usar os.getenv("VAR")
3. Imports relativos - siempre from app.*
4. Sin type hints - def search(q: str) -> list[dict]:
5. print() - usar logger.info()
6. except Exception - except SpecificError as e:
7. Ignorar cambios arquitectura - documentar
8. Código muerto - deletrear

SIEMPRE HACER
=============
- Pydantic BaseModel con Field() constraints
- async/await para I/O (Qdrant, Ollama, DB)
- Logging JSON: logger.info("msg", extra={"trace_id": id})
- Dependency Injection: Depends(get_user_by_api_key)
- Separar concerns: 1 función = 1 responsabilidad
- Type hints: parámetros y return values
- Transacciones DB: try/except/finally

FLUJO ONBOARDING (TESTING E2E CON test_e2e_30.py)
=================================================
Frontend (o test_e2e_30.py) ejecuta:
1. POST /onboarding/tenant -> backend-saas (Guarda tenant en Postgres)
2. POST /onboarding/upload -> backend-saas (Guarda PDFs/TXTs en servidor local /uploads)
3. GET  /onboarding/status -> backend-saas (Verifica Postgres data)
4. POST /onboarding/ingest -> backend-agents:8001
   -> Toma el form_json enviado como Form Data.
   -> Corta (Split) el documento.
   -> Genera Chunks empleando LLM (Gemma3/Claude) y Ollama Embeddings.
   -> store_in_qdrant().
        
RESULTADO: Vectores indexados en Qdrant por tenant.
¡Importante! Ambos backends (SaaS y Agents) comparten la tabla de `User` (vía prisma/auth_service.py) para validar la Header `X-API-Key` contra Postgres de manera unificada.

FLUJO QUERY
===========
Frontend POST /agent/execute
  -> backend-agents engine/planner.py run_agent()
     1. RAG Node:
        - embed(query) -> Ollama
        - search_qdrant() -> Qdrant
     2. Planner Node:
        - build_prompt(query + context)
        - llm_call() -> Ollama gemma3
        - should_continue() -> ¿finished?
     3. persist_trace() -> PostgreSQL

RESULTADO: AgentResponse(trace_id, query, result, metadata)

ARCHIVOS CLAVE
==============
backend-saas/app/
  main.py - FastAPI
  auth_router.py + auth_service.py
  onboarding_router.py + onboarding_service.py
  db/models.py - Schemas
  lib/logging_utils.py

backend-agents/app/
  main.py - FastAPI
  engine/planner.py - run_agent()
  engine/state.py - GraphState
  tools/rag.py - search(query, tenant_id)
  auth/agent_auth.py - validate key
  db/trace_service.py - persist traces
  qdrant/client.py - Wrapper
  models.py - Pydantic models
  embedding_utils.py - embed()

CHECKLIST
=========
[ ] from app.* imports
[ ] type hints everywhere
[ ] env variables (.env)
[ ] logger.info() not print
[ ] specific error handling
[ ] Pydantic BaseModel for requests
[ ] async/await for I/O
[ ] docstrings

PROBLEMAS
=========
1. UTF-8 corruption chunks -> fix onboarding_service.py
2. results_count=0 -> fix tools/rag.py
3. Imports rotos -> siempre from app.*

RUTAS PRINCIPALES
=================
backend-saas:8000
 - POST /auth/login
 - POST /auth/register
 - GET /tenant/me
 - GET /auth/users (admin/superadmin)
 - POST /onboarding/tenant
 - POST /onboarding/upload

backend-agents:8001
 - POST /onboarding/ingest (Form Data: tenant_id, form_json, api_key)
 - POST /agent/execute
 - GET /agent/traces
 - GET /metrics/agent

PEDIR AYUDA
===========
BIEN: "Quiero POST /tenant/update en backend-saas que:
       1. Reciba {nombre, descripcion}
       2. Valide API Key
       3. Actualice PostgreSQL
       4. Retorne {tenant_id, updated_at}
       ¿Dónde va el código?"

REGLA: LEE ESTE ARCHIVO ANTES DE ESCRIBIR CODIGO.

---

GUÍA CLARA - QUÉ ARCHIVO VA A DÓNDE
====================================

Te voy a decir EXACTAMENTE dónde copiar cada archivo.

---

ARCHIVO 1
=========
📥 Descargá: backend-saas-main-FINAL.py
📍 Copiar a: D:\...\agencia-web-b2b\backend-saas\app\main.py
❓ Qué es: FastAPI app principal de backend-saas
📋 Contiene: /health, /auth/*, /onboarding/tenant, /onboarding/upload, /onboarding/status, /tenant/me
🔧 Comando:
copy backend-saas-main-FINAL.py "D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\backend-saas\app\main.py"

---

ARCHIVO 2
=========
📥 Descargá: backend-saas-onboarding_router-FINAL.py
📍 Copiar a: D:\...\agencia-web-b2b\backend-saas\app\onboarding_router.py
❓ Qué es: Router FastAPI para onboarding (sin /ingest)
📋 Contiene: POST /onboarding/tenant, POST /onboarding/upload, GET /onboarding/status, DELETE /onboarding/tenant
🔧 Comando:
copy backend-saas-onboarding_router-FINAL.py "D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\backend-saas\app\onboarding_router.py"

---

ARCHIVO 3
=========
📥 Descargá: backend-agents-main-FINAL.py
📍 Copiar a: D:\...\agencia-web-b2b\backend-agents\app\main.py
❓ Qué es: FastAPI app principal de backend-agents
📋 Contiene: /health, /agent/execute, /agent/traces, /metrics/agent, /onboarding/ingest
🔧 Comando:
copy backend-agents-main-FINAL.py "D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\backend-agents\app\main.py"

---

ARCHIVO 4
=========
📥 Descargá: backend-agents-onboarding_router-FINAL.py
📍 Copiar a: D:\...\agencia-web-b2b\backend-agents\app\onboarding_router.py
❓ Qué es: Router FastAPI para onboarding en backend-agents
📋 Contiene: POST /onboarding/ingest (LLM + Qdrant)
🔧 Comando:
copy backend-agents-onboarding_router-FINAL.py "D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\backend-agents\app\onboarding_router.py"

---

ARCHIVO 5
=========
📥 Descargá: backend-agents-onboarding_models.py
📍 Copiar a: D:\...\agencia-web-b2b\backend-agents\app\onboarding_models.py
❓ Qué es: Modelos Pydantic para formulario de onboarding
📋 Contiene: OnboardingForm, IngestResponse, Sede, Servicio, etc.
🔧 Comando:
copy backend-agents-onboarding_models.py "D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\backend-agents\app\onboarding_models.py"

---

ARCHIVO 6
=========
📥 Descargá: backend-agents-onboarding_service.py
📍 Copiar a: D:\...\agencia-web-b2b\backend-agents\app\onboarding_service.py
❓ Qué es: Lógica de ingesta (PostgreSQL + LLM + Qdrant)
📋 Contiene: setup_postgresql(), generate_deterministic_chunks(), process_document_with_llm(), store_in_qdrant(), run_ingestion_pipeline()
🔧 Comando:
copy backend-agents-onboarding_service.py "D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\backend-agents\app\onboarding_service.py"

---

RESUMEN VISUAL
==============

backend-saas\app\
├── main.py                    ← ARCHIVO 1 (backend-saas-main-FINAL.py)
├── onboarding_router.py       ← ARCHIVO 2 (backend-saas-onboarding_router-FINAL.py)
├── auth_router.py             (YA EXISTE, no toques)
├── auth_service.py            (YA EXISTE, no toques)
├── onboarding_service.py      (YA EXISTE, pero verifica que setup_postgresql() esté aquí)
└── ...

backend-agents\app\
├── main.py                    ← ARCHIVO 3 (backend-agents-main-FINAL.py)
├── onboarding_router.py       ← ARCHIVO 4 (backend-agents-onboarding_router-FINAL.py)
├── onboarding_models.py       ← ARCHIVO 5 (backend-agents-onboarding_models.py)
├── onboarding_service.py      ← ARCHIVO 6 (backend-agents-onboarding_service.py)
├── engine/
├── tools/
├── auth/
├── db/
├── lib/
└── ...

---

ORDEN DE COPIA (IMPORTANTE):
============================

1. Primero: backend-saas (2 archivos)
   - Copiar main.py
   - Copiar onboarding_router.py

2. Después: backend-agents (4 archivos)
   - Copiar onboarding_models.py
   - Copiar onboarding_service.py
   - Copiar onboarding_router.py
   - Copiar main.py (ÚLTIMO porque importa todo lo anterior)