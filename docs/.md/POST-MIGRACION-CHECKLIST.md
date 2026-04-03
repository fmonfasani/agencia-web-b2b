# POST-MIGRACIÓN CHECKLIST
## Pasos después de ejecutar migrate-to-separate-architecture.ps1

**Tiempo estimado:** 1-2 horas  
**Dificultad:** Media  
**Riesgo:** Bajo (git permite revertir)

---

## ✅ CHECKLIST FASE 1: Verificación

```
[ ] 1. Verificar que backend-agents/ fue creado
    $ ls backend-agents/
    # Debe mostrar: app/, requirements.txt, etc.

[ ] 2. Verificar que archivos fueron movidos
    $ ls backend-saas/app/ | findstr engine
    # Debe estar VACÍO (no debe haber engine/)
    
[ ] 3. Verificar git status
    $ git status
    # Debe mostrar:
    # - new file: backend-agents/app/...
    # - deleted: backend-saas/app/engine/...
    # - deleted: backend-saas/app/tools/...
    # - deleted: backend-saas/app/qdrant/...
```

---

## 🔧 CHECKLIST FASE 2: Configuración de backend-agents/

### 2.1. Crear main.py

```bash
# Copiar la plantilla
copy backend-agents-main.py.template backend-agents/app/main.py

# (Ver archivo: backend-agents-main.py.template para el contenido)
```

**Verificación:**
```bash
python -m py_compile backend-agents/app/main.py
# Debe pasar sin errores
```

---

### 2.2. Crear .env file

```bash
# backend-agents/.env

DATABASE_URL=postgresql://postgres:Karaoke27570Echeverria@localhost:5432/agencia_web_b2b
ALLOWED_ORIGINS=http://localhost:3001,http://127.0.0.1:3001

# LLM
OLLAMA_BASE_URL=http://localhost:11434
DEFAULT_MODEL=gemma3:latest

# Testing
ALLOW_FALLBACK_TENANT=false
DEFAULT_TENANT_ID=default

# Logging
LOG_LEVEL=INFO
```

---

### 2.3. Crear docker-compose.yml (opcional, para desarrollo)

```bash
# backend-agents/docker-compose.yml

version: '3.8'

services:
  agent-api:
    build: .
    container_name: webshooks-agent-api
    ports:
      - "8001:8001"
    environment:
      - DATABASE_URL=postgresql://postgres:Karaoke27570Echeverria@localhost:5432/agencia_web_b2b
      - OLLAMA_BASE_URL=http://host.docker.internal:11434
    volumes:
      - .:/app
    command: uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

---

### 2.4. Crear Dockerfile

```bash
# backend-agents/Dockerfile

FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
```

---

## 🔗 CHECKLIST FASE 3: Actualizar imports en backend-agents/

### 3.1. backend-agents/app/engine/planner.py

**Cambio 1: DATABASE_URL**

```python
# ANTES:
conn = psycopg2.connect("postgresql://postgres:Karaoke27570Echeverria@localhost:5432/agencia_web_b2b")

# DESPUÉS:
import os
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:...")
conn = psycopg2.connect(DATABASE_URL)
```

**Cambio 2: _load_tenant_config()**

```python
# ANTES (línea ~48):
conn = psycopg2.connect("postgresql://postgres:...")

# DESPUÉS:
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://...")
conn = psycopg2.connect(DATABASE_URL)
```

**Verificación:**
```bash
# Buscar hardcoded DSN
findstr "postgresql://" backend-agents/app/engine/planner.py
# Debe retornar VACÍO (no debe haber hardcoded strings)
```

---

### 3.2. backend-agents/app/db/trace_service.py

**Si existe, verificar DSN:**

```python
# ANTES:
_DSN = "postgresql://postgres:..."

# DESPUÉS:
import os
_DSN = os.getenv("DATABASE_URL", "postgresql://...")
```

---

### 3.3. backend-agents/app/embedding_utils.py

**Verificar OLLAMA_BASE_URL:**

```python
# ANTES:
OLLAMA_BASE_URL = "http://localhost:11434"

# DESPUÉS:
import os
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
```

---

## 🧪 CHECKLIST FASE 4: Testing

### 4.1. Instalar dependencies

```bash
cd backend-agents
pip install -r requirements.txt

# Verificación:
python -c "import fastapi; import langgraph; print('OK')"
```

### 4.2. Test de imports

```bash
cd backend-agents
python -c "from app.engine.langgraph_engine import LangGraphEngine; print('LangGraphEngine OK')"
python -c "from app.tools.rag import search; print('RAG OK')"
python -c "from app.engine.adapters import RagRetriever, OllamaAdapter; print('Adapters OK')"
```

**Si todos OK:**
```
✓ LangGraphEngine OK
✓ RAG OK
✓ Adapters OK
```

---

### 4.3. Test de auth

```bash
python -c "from app.auth.agent_auth import get_user_by_api_key; print('Auth OK')"
```

---

### 4.4. Iniciar servidor de desarrollo

```bash
cd backend-agents
uvicorn app.main:app --port 8001 --reload

# Debe mostrar:
# INFO:     Uvicorn running on http://127.0.0.1:8001
```

**En otra terminal, test:**

```bash
# Sin API key (debe fallar)
curl -X POST http://localhost:8001/agent/execute \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}'
# Respuesta esperada: 401 Unauthorized

# Con API key válida (si tienes una)
curl -X POST http://localhost:8001/agent/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: wh_xxxxx" \
  -d '{"query": "¿Qué servicios ofrecen?"}'
# Respuesta esperada: 200 OK con agent result
```

---

## 🧹 CHECKLIST FASE 5: Limpiar backend-saas/

### 5.1. Actualizar backend-saas/app/main.py

**Remover completamente estos bloques:**

```python
# REMOVER:
from app.engine.langgraph_engine import LangGraphEngine

# REMOVER:
@app.post("/agent/execute", ...)
async def execute(...):
    ...

# REMOVER:
@app.get("/agent/traces", ...)
async def get_traces(...):
    ...

# REMOVER:
@app.get("/metrics/agent", ...)
async def get_metrics(...):
    ...
```

**Mantener SOLO:**

```python
from app.auth_router import router as auth_router
from app.onboarding_router import router as onboarding_router

@app.get("/health")
@app.get("/tenant/me")
@app.include_router(auth_router)
@app.include_router(onboarding_router)
```

**Verificación:**

```bash
# Buscar que no haya referencias a engine
findstr "LangGraphEngine" backend-saas/app/main.py
# Debe retornar VACÍO
```

---

### 5.2. backend-saas/app/models.py

**Opción A: Mantener en backend-saas**

```python
# Si backend-saas también usa AgentRequest, AgentResponse
# MANTENER las clases en ambos directorios (duplicación tolerable)
```

**Opción B: Crear shared package (avanzado)**

```bash
# Crear: webshooks_common/models.py
# Ambos servicios usan: from webshooks_common.models import AgentRequest

# Para desarrollo:
pip install -e ../webshooks_common

# Para producción:
pip install webshooks-common==0.1.0  # de PyPI
```

**Recomendación:** Opción A (mantener duplicados por ahora).

---

## 🔄 CHECKLIST FASE 6: Frontend Updates

### 6.1. Actualizar endpoints del frontend

**ANTES:**

```javascript
// src/lib/agent-service/client.ts
const AGENT_BASE_URL = "http://localhost:8000/agent";  // same service

// POST /agent/execute → localhost:8000/agent/execute
// GET /agent/traces → localhost:8000/agent/traces
```

**DESPUÉS:**

```javascript
// src/lib/agent-service/client.ts
const AGENT_BASE_URL = "http://localhost:8001/agent";  // separate service

// POST /agent/execute → localhost:8001/agent/execute
// GET /agent/traces → localhost:8001/agent/traces
```

**Archivo a actualizar:**

```bash
grep -r "8000/agent" src/
# Reemplazar 8000 → 8001 donde sea necesario
```

---

## 📝 CHECKLIST FASE 7: Git & Commit

```bash
[ ] 1. Verificar cambios
    $ git status

[ ] 2. Ver diff (opcional pero recomendado)
    $ git diff --stat

[ ] 3. Commit
    $ git commit -m "refactor: separate SaaS from Agent architecture

    - Move engine/, tools/, qdrant/ to backend-agents/
    - Create new backend-agents service with LangGraph, RAG
    - backend-saas now only handles auth, onboarding, users
    - Both services share PostgreSQL database
    - Agent service runs on port 8001
    - Frontend updated to call separate endpoints"

[ ] 4. Verificar commit
    $ git log --oneline -1
```

---

## 🚀 CHECKLIST FASE 8: Validación End-to-End

### 8.1. Verificar ambos servicios pueden iniciar

```bash
# Terminal 1: backend-saas
cd backend-saas
pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload
# Output: INFO: Uvicorn running on http://127.0.0.1:8000

# Terminal 2: backend-agents
cd backend-agents
pip install -r requirements.txt
uvicorn app.main:app --port 8001 --reload
# Output: INFO: Uvicorn running on http://127.0.0.1:8001
```

### 8.2. Verificar health endpoints

```bash
curl http://localhost:8000/health
# Expected: {"status": "ok", "service": "saas"}

curl http://localhost:8001/health
# Expected: {"status": "ok", "service": "agent-engine"}
```

### 8.3. Prueba de autenticación en backend-agents

```bash
# Sin API key (debe fallar)
curl -X POST http://localhost:8001/agent/execute \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}'
# Expected: 401 Unauthorized
```

### 8.4. Prueba completa (si tienes test tenant y API key)

```bash
# Con API key válida
API_KEY="wh_xxxxx"  # Tu API key

curl -X POST http://localhost:8001/agent/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "query": "¿Qué servicios ofrecen?",
    "tenant_id": "tenant_sistema_diagnostico",
    "enable_detailed_trace": true
  }'
```

**Expected response:**

```json
{
  "trace_id": "...",
  "tenant_id": "tenant_sistema_diagnostico",
  "query": "¿Qué servicios ofrecen?",
  "iterations": 1,
  "result": [...],
  "metadata": {...},
  "total_duration_ms": 2345
}
```

---

## ⚠️ TROUBLESHOOTING

### Error: "ModuleNotFoundError: No module named 'app.engine'"

**Causa:** Python path no está configurado correctamente.

```bash
# Verificar que estás en el directorio correcto
pwd
# Debe mostrar: .../agencia-web-b2b

# Reinstalar dependencies
pip install -e .
```

---

### Error: "database connection refused"

```bash
# Verificar PostgreSQL está corriendo
psql -U postgres -d agencia_web_b2b -c "SELECT 1"

# Verificar DATABASE_URL en .env
cat backend-agents/.env | findstr DATABASE_URL

# Verificar credenciales
psql postgresql://postgres:Karaoke27570Echeverria@localhost:5432/agencia_web_b2b
```

---

### Error: "Ollama connection refused"

```bash
# Verificar Ollama está corriendo
ollama serve

# O en otra terminal:
curl http://localhost:11434/api/models

# Verificar OLLAMA_BASE_URL en .env
cat backend-agents/.env | findstr OLLAMA
```

---

## 📊 Resumen de Cambios

```
backend-saas/
  ✅ Mantiene: auth_router, onboarding_router, models, db/
  ❌ Pierde: engine/, tools/, qdrant/, embedding_utils.py, llm/

backend-agents/ (NUEVO)
  ✅ Gana: engine/, tools/, qdrant/, embedding_utils.py, llm/
  ✅ Gana: auth/agent_auth.py
  ✅ Gana: main.py con /agent/execute, /agent/traces, /metrics/agent

Frontend
  ✅ Actualiza: agent endpoints 8000 → 8001
  ✅ Mantiene: auth endpoints 8000

Ports
  8000 → backend-saas (SaaS platform)
  8001 → backend-agents (Agent engine)
  3001 → Frontend

Database
  Ambos servicios comparten: agencia_web_b2b PostgreSQL
```

---

## 🎉 ¡LISTO!

Cuando completaste todos los checklists:

```bash
✓ backend-agents/ creado y funcional
✓ backend-saas/ limpiado
✓ Ambos servicios arrancan en puertos diferentes
✓ Frontend actualizado
✓ Git committeado

# Próximos pasos:
1. Deploy en Hetzner dual VPS
2. Setup CI/CD pipelines
3. Monitoreo y observabilidad
```

---

**Tiempo total estimado:** 1-2 horas  
**Dificultad:** Media  
**Recompensa:** Arquitectura escalable, mantenible, profesional ✨

