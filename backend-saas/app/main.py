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
from app.auth_router import router as auth_router, get_current_user
from app.auth_service import get_user_by_api_key
from app.onboarding_router import router as onboarding_router  # Solo /tenant, /upload, /status, /delete
from app.tenant_router import router as tenant_router
from app.routers.agent_proxy_router import router as agent_proxy_router

# Initialize structured logs
setup_structured_logging()
logger = logging.getLogger(__name__)

# Rate limiting setup
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(
    title="Webshooks SaaS API",
    description="""
# Backend SaaS - Multitenant Agent Platform

Gestión completa de usuarios, tenants y onboarding para agentes especializados.

## 🔐 Flujo de Autenticación

1. **Registrarse** → `POST /auth/register` (usuario inactivo)
2. **Admin activa** → `POST /auth/activate` (solo admins)
3. **Login** → `POST /auth/login` (obtener API Key)
4. **Usar API Key** → Copiar en header `X-API-Key` o click en "Authorize" arriba

## 🎯 Flujo de Onboarding (Ingestión de Datos)

1. **Crear tenant** → `POST /onboarding/tenant` (guardar empresa/negocio)
2. **Subir archivos** → `POST /onboarding/upload` (documentos, PDFs, etc.)
3. **Procesar con LLM** → `POST http://backend-agents:8001/onboarding/ingest`
4. **Verificar estado** → `GET /onboarding/status/{tenant_id}`

## 👥 Roles

- **cliente**: acceso solo a su propio tenant. Requiere `tenant_id` en registro.
- **analista**: gestiona todos los tenants. Sin `tenant_id`.
- **admin/superadmin**: control total de usuarios y tenants.

## 🔑 API Key Format

Obtenida en `POST /auth/login`. Formato: `wh_xxxxxx...`

Usarla en cada request con header: `X-API-Key: wh_xxxxx`

## 📋 Headers Soportados

- `X-API-Key` (requerido): tu API key de login
- `X-Trace-Id` (opcional): para tracing distribuido. Se genera automáticamente si no se proporciona.
- `Content-Type` (automático): application/json

## ⚡ Rate Limiting

Limitado a 100 requests por minuto por IP (configurable).

## 📊 Observabilidad

Cada response incluye:
- `X-Process-Time`: tiempo de procesamiento en segundos
- `X-Trace-Id`: ID único para tracing distribuido
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
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


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "backend-saas"}


@app.get("/tenant/me", tags=["Tenant"])
async def get_tenant_me(current_user: dict = Depends(get_current_user)):
    """Retorna el perfil del usuario y su tenant."""
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