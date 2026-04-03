CLAUDE-INSTRUCCIONES.txt
========================
GUÍA PARA CLAUDE - Cómo trabajar en webshooks.com

ANTES DE ESCRIBIR CÓDIGO
========================
1. ¿Dónde va? ¿backend-saas:8000 o backend-agents:8001?
   - Si no sé, PREGUNTAR
   
2. ¿Necesito ver código existente primero?
   - Si es nuevo endpoint/servicio, ver archivo similar primero
   - Si es fix/update, ver código actual ANTES de cambiar
   
3. ¿Cuál es el flujo exacto?
   - ¿Qué frontend/backend envía?
   - ¿Qué procesa el código?
   - ¿Qué retorna/persiste?

ESCRIBIR CÓDIGO
===============
1. IMPORTS: Siempre from app.* (nunca ../)
2. TYPE HINTS: Parámetros y return values
3. ENV VARIABLES: os.getenv("VAR")
4. LOGGING: logger.info("msg", extra={...})
5. ERROR HANDLING: except SpecificError, no Exception
6. ASYNC: Toda I/O debe ser async/await
7. PYDANTIC: Usar BaseModel para requests/responses
8. DOCSTRINGS: Todas las funciones públicas

VALIDACIONES OBLIGATORIAS
==========================
[ ] ¿Code está en el backend correcto?
[ ] ¿Imports desde app.*?
[ ] ¿Type hints completos?
[ ] ¿Env variables (no hardcoding)?
[ ] ¿Logging estructurado?
[ ] ¿Error handling específico?
[ ] ¿async/await si es I/O?
[ ] ¿Pydantic BaseModel si es request?

RESPONDER SIEMPRE ASÍ
====================
1. Verificar contexto (pedir si no tengo)
2. Mostrar DÓNDE va el código
3. Mostrar qué archivos toco
4. Escribir código limpio
5. Explicar QUÉ hace (no cómo usarlo)
6. Listar archivos a descargar/copiar

NUNCA HACER
===========
- Especular arquitectura - pedir código primero
- Hardcoding (passwords, URLs, ports)
- Imports relativos (..)
- Sin type hints
- print() en lugar de logger.info()
- except Exception (siempre específico)
- Código sin docstrings
- Ignorar que backend-agents requiere imports correctos

FLUJOS MEMORIZADOS
==================
ONBOARDING: Frontend -> backend-saas POST /onboarding/ingest
  -> onboarding_service.run_ingestion_pipeline()
  -> embed() en Ollama
  -> upsert() en Qdrant
  
QUERY: Frontend -> backend-agents POST /agent/execute
  -> engine/planner.py run_agent()
  -> RAG Node: embed() + search_qdrant()
  -> Planner Node: llm_call()
  -> persist_trace() en PostgreSQL

ARCHIVOS CRÍTICOS
=================
backend-saas/app/
  - main.py (routers)
  - auth_router.py + auth_service.py
  - onboarding_router.py + onboarding_service.py
  - db/models.py (schemas)

backend-agents/app/
  - main.py (routers)
  - engine/planner.py (run_agent)
  - tools/rag.py (search)
  - auth/agent_auth.py (validate key)
  - db/trace_service.py (persist)
  - models.py (Pydantic)
  - embedding_utils.py (embed)

SI USUARIO DICE...
==================
"Agregar endpoint X"
  -> PREGUNTAR: ¿dónde? ¿qué valida? ¿qué retorna? ¿dónde persiste?

"Fijar bug en Y"
  -> PEDIR: Ver código de Y primero

"Conectar frontend con backend"
  -> PREGUNTAR: ¿cuál frontend? ¿cuál endpoint backend?

"Escribir código para Z"
  -> PEDIR: Contexto. ¿Dónde va? ¿Flujo?

SIEMPRE RECORDAR
================
- Usuario no escribe código - paga para que lo haga
- Usuario no quiere explicaciones largas - quiere CÓDIGO
- Usuario quiere que VERIFIQUE arquitectura - no que especule
- Usuario quiere que PREGUNTE si no tengo contexto
- Backend-agents:8001 SOLO puede importar from app.*

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