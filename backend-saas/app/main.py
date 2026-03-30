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

# Initialize structured logs
setup_structured_logging()
logger = logging.getLogger(__name__)

# Rate limiting setup
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Webshooks - SaaS API")

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