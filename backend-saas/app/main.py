"""
backend-saas/app/main.py
FastAPI application for SaaS management.
Handles: Auth, Onboarding, Tenant management.
"""
import sys
import os
import time
import uuid
import logging
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.lib.logging_utils import setup_structured_logging, trace_id_var
from app.lib.health_check import get_full_health_status
from app.auth_router import router as auth_router, get_current_user
from app.auth_service import get_user_by_api_key
from app.onboarding_router import router as onboarding_router  # Solo /tenant, /upload, /status, /delete
from app.tenant_router import router as tenant_router
from app.routers.agent_proxy_router import router as agent_proxy_router
from app.training_router import router as training_router

# Initialize structured logs
setup_structured_logging()
logger = logging.getLogger(__name__)

# Rate limiting setup
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(
    title="Webshooks SaaS API",
    description="""
# Webshooks SaaS API — Plataforma Multitenant de Agentes Inteligentes

API completa para gestionar usuarios, tenants y ejecutar agentes especializados con RAG.

## 🏗️ Arquitectura

Este backend (`backend-saas`) maneja:
- **Autenticación y usuarios** (registro, login, roles)
- **Onboarding** (creación de tenants, subida de archivos)
- **Gestión de tenants** (CRUD, listado)
- **Proxy a agentes** (reenvío de consultas a `backend-agents`)

El sistema es **multitenant** — cada tenant (cliente) tiene sus datos aislados en PostgreSQL y Qdrant.

---

## 🔐 Flujo de Autenticación

### 1. Registro
`POST /auth/register`

Crea un usuario **inactivo**. Los usuarios `cliente` requieren `tenant_id`; los `analista` y `admin` no.

**Ejemplo:**
```json
{
  "email": "recepcionista@clinica.ar",
  "password": "segura123",
  "nombre": "María García",
  "rol": "cliente",
  "tenant_id": "clinica-x-buenos-aires"
}
```

### 2. Activación (solo admin)
`POST /auth/activate`

Un administrador activa la cuenta del usuario registrado.

### 3. Login
`POST /auth/login`

Obtén tu **API Key** (formato `wh_xxxxx`). Esta clave se usa en todas las requests posteriores.

**Respuesta:**
```json
{
  "id": "user_123",
  "api_key": "wh_abc123...",
  "email": "recepcionista@clinica.ar",
  "nombre": "María García",
  "rol": "cliente",
  "tenant_id": "clinica-x-buenos-aires",
  "mensaje": "Bienvenido María García. Copiá tu api_key y usala en Authorize."
}
```

### 4. Usar la API Key

Incluye en cada request el header:

```
X-API-Key: wh_tu_api_key_aqui
```

O usa el botón **Authorize** en Swagger UI (arriba a la derecha).

---

## 🎯 Flujo de Onboarding (Ingestión de Datos)

### Paso 1 — Crear Tenant
`POST /onboarding/tenant`

Carga la configuración del negocio (empresa, clínica, etc.) en PostgreSQL.

**Ejemplo completo:**
```json
{
  "tenant_id": "clinica-x-buenos-aires",
  "tenant_nombre": "Clínica X - Buenos Aires",
  "created_by": "analista_interno",
  "industria": "salud",
  "subcategoria": "clinica_multiespecialista",
  "descripcion_corta": "Clínica privada multiespecialista con 50+ profesionales",
  "ubicacion": "Buenos Aires, Argentina",
  "idioma": "es",
  "proposito_principal": "Agendar turnos y consultar información de coberturas",
  "acciones_habilitadas": ["agendar_turno", "consultar_cobertura", "ver_especialidades"],
  "acciones_prohibidas": ["modificar_historia", "acceder_datos_paciente"],
  "tono": "profesional_y_cercano",
  "mensaje_fallback": "Lo siento, no puedo ayudarte con eso. Llamá a nuestro whatsapp.",
  "entidades_clave": [
    {
      "nombre": "Especialidades",
      "descripcion": "Especialidades médicas disponibles",
      "storage": "postgresql_y_qdrant",
      "es_consultable_directamente": true,
      "atributos": ["nombre", "descripcion", "tiempo_consulta"]
    }
  ],
  "coberturas": ["OSDE", "SWISS MEDICAL", "GALENO"],
  "sedes": [
    {
      "nombre": "Sede Centro",
      "direccion": "Av. Corrientes 1234, CABA",
      "telefonos": ["1123456789"],
      "mail": "centro@clinica-x.ar",
      "horario_semana": "Lun-Vier 8:00-20:00"
    }
  ],
  "servicios": [
    {"nombre": "Cardiología", "categoria": "especialidad", "descripcion": "..."}
  ],
  "hints": {
    "industria_context": "Healthcare en Argentina",
    "terminos_clave": ["turno", "cobertura", "obra social"]
  },
  "routing_rules": []
}
```

### Paso 2 — Subir Archivos
`POST /onboarding/upload`

Sube los documentos PDF, TXT, Excel, CSV que contienen la información del negocio.

**Form Data:**
- `tenant_id` (string)
- `file1`, `file2`, `file3` (archivos, máximo 3)

### Paso 3 — Procesar con LLM (backend-agents)
`POST http://backend-agents:8001/onboarding/ingest`

Este endpoint (en otro servicio) procesa los archivos subidos:
- Extrae texto (PDF, Excel, etc.)
- Genera chunks inteligentes con LLM
- Crea embeddings con Ollama
- Almacena vectores en Qdrant

### Paso 4 — Verificar Estado
`GET /onboarding/status/{tenant_id}`

Verifica que los datos estén en PostgreSQL y los vectores en Qdrant.

---

## 🤖 Flujo de Consulta (Agent Execution)

Una vez completado el onboarding, los usuarios pueden hacer preguntas al agente:

`POST /agent/execute`

**Request:**
```json
{
  "tenant_id": "clinica-x-buenos-aires",
  "query": "¿Qué coberturas aceptan en la sede centro?",
  "enable_detailed_trace": false
}
```

**Response:**
```json
{
  "trace_id": "trace_abc123",
  "tenant_id": "clinica-x-buenos-aires",
  "query": "¿Qué coberturas aceptan en la sede centro?",
  "result": [
    {"role": "assistant", "content": "En la sede centro aceptamos OSDE, Swiss Medical y Galeno..."}
  ],
  "iterations": 1,
  "metadata": {...},
  "total_duration_ms": 1850,
  ...
}
```

El agente ejecuta:
1. **RAG**: busca en Qdrant los chunks relevantes
2. **Planner**: decide si necesita más búsquedas o ya puede responder
3. **Respuesta**: genera respuesta final con contexto

---

## 👥 Roles de Usuario

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| `cliente` | Usuario final | Solo su propio `tenant_id` |
| `analista` | Operador interno | Todos los tenants (lectura/escritura) |
| `admin` | Administrador | Control total de usuarios y tenants |
| `superadmin` / `super_admin` | Super usuario | Igual que admin, con permisos extendidos |

---

## 🔑 API Key Format

- Formato: `wh_xxxxx...` (obtenido en `POST /auth/login`)
- Se envía en header: `X-API-Key`
- No expira
- Se genera por usuario

---

## 📋 Headers Soportados

| Header | Descripción |
|--------|-------------|
| `X-API-Key` | **Requerido**. API key del usuario. |
| `X-Trace-Id` | Opcional. ID para tracing distribuido. Si no se envía, se genera automáticamente. |
| `Content-Type` | Automático para JSON: `application/json` |

---

## ⚡ Rate Limiting

- Límite: **100 requests por minuto** por IP (configurable)
- Excedido: `429 Too Many Requests`

---

## 📊 Observabilidad

Cada response incluye headers:

- `X-Process-Time`: tiempo de procesamiento en segundos
- `X-Trace-Id`: ID único para correlación de logs

Los logs están en formato JSON estructurado con `trace_id`, `tenant_id`, etc.

---

## 🔍 Endpoints por Grupo

| Tag | Endpoints |
|-----|-----------|
| **Autenticación** | `/auth/register`, `/auth/login`, `/auth/me`, `/auth/users`, `/auth/activate`, `/auth/create-analista` |
| **Onboarding** | `/onboarding/tenant`, `/onboarding/upload`, `/onboarding/status/{tenant_id}`, `/onboarding/tenant/{tenant_id}` |
| **Tenant Management** | `/tenant/`, `/tenant/{tenant_id}`, `/tenant/{tenant_id}` (PUT), `/tenant/me` |
| **Agent Proxy** | `/agent/execute`, `/agent/config`, `/agent/traces`, `/metrics/agent` |
| **Salud** | `/health` (comprehensive health check) |

---

## 🚀 Getting Started

1. **Registra un analista** (primer usuario):
```bash
curl -X POST http://localhost:8000/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"email":"admin@webshooks.com","password":"admin123","nombre":"Admin","rol":"analista"}'
```

2. **Activa el usuario** (desde Swagger, usando `POST /auth/activate` como analista).

3. **Login** para obtener API key:
```bash
curl -X POST http://localhost:8000/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"admin@webshooks.com","password":"admin123"}'
```

4. **Usa la API key** en Swagger: botón **Authorize** → pega `wh_xxxxx`.

5. **Crea tu primer tenant** con `POST /onboarding/tenant`.

6. **Sube archivos** con `POST /onboarding/upload`.

7. **Procesa** en backend-agents: `POST http://localhost:8001/onboarding/ingest`.

8. **Ejecuta el agente**: `POST /agent/execute`.

---

## 🤖 Agentes Especializados (via API Gateway)

El backend-saas actúa como **punto único de entrada** (API Gateway).
Los agentes son internos — el cliente solo interactúa con este backend.

**4 Endpoints de Agentes:**

1. **Ejecutar agente** → `POST /agent/execute` (consulta en lenguaje natural)
   - Envía: `{query, tenant_id, enable_detailed_trace, max_iterations, temperature}`
   - Retorna: `{trace_id, query, result, iterations, metadata, total_duration_ms}`

2. **Ver configuración** → `GET /agent/config` (datos del negocio del tenant)
   - Retorna: `{tenant_id, nombre, servicios, sedes, coberturas}`

3. **Ver trazas** → `GET /agent/traces` (historial de consultas, auditoría)
   - Query param: `limit` (1-100, default 50)
   - Retorna: array de ejecuciones con query, result, iterations, timestamps

4. **Ver métricas** → `GET /agent/metrics/agent` (performance y convergencia)
   - Retorna: `{avg_iterations, avg_duration_ms, total_executions, success_rate}`

**Cómo funciona:**
- Cliente envía request a `/agent/*` en backend-saas:8000
- Backend-saas valida API Key y tenant access
- Reenvía (proxies) transparentemente a backend-agents:8001
- Backend-agents usa RAG (Qdrant + LLM Ollama) para responder
- Resultado se retorna al cliente

---

## 📚 Especificación OpenAPI

- **Title**: Webshooks SaaS API
- **Version**: 1.0.0
- **Servers**: `http://localhost:8000` (desarrollo)
- **Docs**: `/docs` (Swagger UI), `/redoc` (ReDoc)
""",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {
            "name": "Autenticación",
            "description": "Registro, login, gestión de usuarios y API keys"
        },
        {
            "name": "Onboarding",
            "description": "Creación de tenants, subida de archivos, estado de ingesta"
        },
        {
            "name": "Tenant Management",
            "description": "Gestión de tenants (listar, obtener, actualizar)"
        },
        {
            "name": "Agent Proxy",
            "description": "Endpoints proxy para ejecutar agentes, obtener trazas y métricas"
        },
    ],
)

# Configure CORS
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3001,http://127.0.0.1:3001").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Routers
app.include_router(auth_router)
app.include_router(onboarding_router)
app.include_router(tenant_router)
app.include_router(agent_proxy_router)
app.include_router(training_router)


@app.on_event("startup")
async def startup_event():
    from app.training_service import ensure_tables
    try:
        ensure_tables()
        logger.info("Training tables ready")
    except Exception as e:
        logger.error("Could not ensure training tables: %s", e)


# --- Middleware for Trace ID & Performance ---
@app.middleware("http")
async def add_process_time_and_trace_id(request: Request, call_next):
    start_time = time.time()
    trace_id = request.headers.get("X-Trace-Id", str(uuid.uuid4()))
    token = trace_id_var.set(trace_id)

    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        response.headers["X-Trace-Id"] = trace_id

        logger.info(
            f"Request completed: {request.method} {request.url.path}",
            extra={"status_code": response.status_code, "process_time": round(process_time, 4)},
        )
        return response
    finally:
        trace_id_var.reset(token)


@app.get("/health", response_model=dict)
async def health() -> dict:
    """
    Comprehensive health check endpoint.

    Returns overall system status and detailed dependency health information.

    Returns:
        Dict with:
        - status: "healthy", "degraded", or "unhealthy"
        - timestamp: ISO 8601 timestamp
        - dependencies: List of service health checks (postgresql, qdrant, ollama)
    """
    return await get_full_health_status()


@app.get("/tenant/me", tags=["Tenant"], response_model=dict)
async def get_tenant_me(current_user: dict = Depends(get_current_user)):
    """
    Obtener perfil del usuario y su tenant.

    Retorna los datos del usuario autenticado (desde API Key) y los detalles de su tenant
    (nombre, industria, etc.) si corresponde.

    Returns:
        Dict with:
        - user: {id, email, nombre, rol, tenant_id}
        - tenant: {id, nombre, industria} or null if no tenant access
    """
    import psycopg2
    from app.db.trace_service import _DSN

    tenant_id = current_user.get("tenant_id")
    tenant_data = None
    if tenant_id:
        try:
            conn = psycopg2.connect(_DSN)
            cur = conn.cursor()
            cur.execute("SELECT id, nombre, industria FROM tenants WHERE id = %s", (tenant_id,))
            row = cur.fetchone()
            conn.close()
            if row:
                tenant_data = {"id": row[0], "nombre": row[1], "industria": row[2]}
        except Exception:
            pass
    return {"user": current_user, "tenant": tenant_data}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)