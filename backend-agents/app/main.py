"""
backend-agents/app/main.py

FastAPI application for the Agent Engine (LangGraph + RAG).
This service handles:
- /agent/execute: Agent execution with RAG context
- /agent/traces: Agent execution traces
- /metrics/agent: Agent convergence metrics
"""

import sys
import os
import asyncio
import json
import psycopg2
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.engine.langgraph_engine import LangGraphEngine
from app.llm.factory import get_llm_provider
from app.lib.logging_utils import setup_structured_logging, trace_id_var
from app.models import (
    AgentRequest,
    AgentResponse,
    ErrorResponse,
    TraceStepType,
    create_tracing_context,
)
from app.auth.agent_auth import get_user_by_api_key, validate_tenant_access
from app.db.trace_service import persist_trace, ensure_traces_table
from app.onboarding_router import router as onboarding_router  # /onboarding/ingest (procesamiento con LLM)
from app.training_ingest_router import router as training_ingest_router  # /training/ingest (chunking + embedding + Qdrant)
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from core.config import settings

import uuid
import logging
import time

# Initialize structured logs
setup_structured_logging()
logger = logging.getLogger(__name__)

# Rate limiting setup
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(
    title="Webshooks Agent Engine API",
    description="""
Motor de agentes inteligentes con RAG y LangGraph.

**Endpoints principales:**
- POST /agent/execute — Ejecutar agente con contexto RAG
- GET  /agent/traces  — Ver trazas de ejecución
- GET  /agent/config  — Obtener configuración del agente (servicios, sedes, coberturas)
- GET  /metrics/agent — Métricas de convergencia
- POST /onboarding/ingest — Pipeline de ingesta (LLM + Qdrant)

**Autenticación:**
Todos los endpoints requieren header `X-API-Key` (obtenido del SaaS).

**Arquitectura:**
- LangGraph para flujo de agente iterativo
- RAG con Qdrant (colecciones por tenant)
- LLMs: Ollama (local) o OpenRouter (cloud con rotation)
- Trazabilidad completa con PostgreSQL
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

# Include onboarding router (LLM + Qdrant processing)
app.include_router(onboarding_router)
# Include training ingest router (chunking + embedding + Qdrant)
app.include_router(training_ingest_router)


@app.on_event("startup")
async def startup_event():
    ensure_traces_table()


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


async def get_agent_tenant(request: Request) -> dict:
    """Dependency — valida API Key y retorna usuario."""
    api_key = request.headers.get("X-API-Key")
    if not api_key:
        raise HTTPException(
            status_code=401,
            detail="API Key requerida. Usá X-API-Key header.",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    user = await get_user_by_api_key(api_key)
    if not user:
        raise HTTPException(status_code=401, detail="API Key inválida o usuario inactivo")
    return user


@app.get("/health")
async def health():
    return {"status": "ok", "service": "agent-engine"}


@app.post("/agent/execute", response_model=AgentResponse)
@limiter.limit("10/minute")
async def execute(
    req: AgentRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_agent_tenant),
):
    """
    Execute agent with RAG context.

    Request body:
    {
        "query": "¿Qué servicios ofrecen?",
        "tenant_id": "tenant_sistema_diagnostico",
        "trace_id": "optional-trace-id",
        "enable_detailed_trace": true/false
    }

    Autenticación:
    - Header: X-API-Key: <tu_api_key>

    Ejecuta el agente con LangGraph + Ollama + Qdrant.
    """
    start_time = time.time()

    # Determinar tenant_id a usar (prioriza request, pero valida permisos)
    tenant_id = req.tenant_id or current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="tenant_id es requerido en el request")

    # VALIDAR ACCESO AL TENANT (solo admin puede usar tenant_id diferente al propio)
    if not validate_tenant_access(current_user, tenant_id):
        raise HTTPException(
            status_code=403,
            detail=f"No tienes permiso para acceder al tenant '{tenant_id}'"
        )

    trace_id = str(uuid.uuid4())
    logger.info(f"[TRACE START] {trace_id} | tenant={tenant_id}")

    try:
        query_clean = req.query.strip()
        malicious_patterns = ["ignore previous instructions", "system override", "bypass safety"]
        if any(p in query_clean.lower() for p in malicious_patterns):
            raise HTTPException(status_code=400, detail="Identified potentially malicious input pattern.")

        # Obtener LLM provider configurado
        llm_provider = get_llm_provider()
        engine = LangGraphEngine(tenant_id=tenant_id, llm_provider=llm_provider)
        
        agent_exec_start = time.time()
        result, metadata = await asyncio.wait_for(
            engine.run(task=query_clean), timeout=60.0
        )
        agent_exec_ms = int((time.time() - agent_exec_start) * 1000)

        background_tasks.add_task(
            persist_trace,
            trace_id=trace_id,
            tenant_id=tenant_id,
            query=query_clean,
            iterations=metadata.get("iterations", 0),
            result=result,
            metadata={
                "model": metadata.get("model", "gemma3:latest"),
                "total_ms": agent_exec_ms,
                "finish_reason": metadata.get("finish_reason", "success"),
            }
        )

        response = AgentResponse(
            trace_id=trace_id,
            tenant_id=tenant_id,
            query=req.query,
            iterations=metadata.get("iterations", 0),
            result=result,
            metadata=metadata,
            total_duration_ms=agent_exec_ms,
            timestamp_start=datetime.fromtimestamp(start_time),
            timestamp_end=datetime.utcnow(),
            x_process_time=str(process_time) if 'process_time' in locals() else None,
        )

        logger.info(f"[TRACE END] {trace_id} | duration={agent_exec_ms}ms")
        return response

    except HTTPException:
        raise
    except asyncio.TimeoutError:
        background_tasks.add_task(
            persist_trace,
            trace_id=trace_id,
            tenant_id=tenant_id,
            query=req.query,
            iterations=0,
            result=[],
            metadata={"total_ms": 60000, "finish_reason": "timeout"}
        )
        return AgentResponse(
            trace_id=trace_id,
            tenant_id=tenant_id,
            query=req.query,
            iterations=0,
            result=[],
            metadata={"error": "timeout", "finish_reason": "timeout"},
            total_duration_ms=60000,
            timestamp_start=datetime.fromtimestamp(start_time),
            timestamp_end=datetime.utcnow(),
        )
        
    except Exception as e:
        background_tasks.add_task(
            persist_trace,
            trace_id=trace_id,
            tenant_id=tenant_id,
            query=req.query,
            iterations=0,
            result=[],
            metadata={"total_ms": int((time.time() - start_time)*1000), "finish_reason": "error"}
        )
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/agent/traces", tags=["Agent"])
async def get_traces(
    limit: int = 50,
    current_user: dict = Depends(get_agent_tenant),
):
    """Retorna las últimas N trazas del tenant autenticado."""
    import psycopg2
    from app.db.trace_service import DATABASE_URL
    
    tenant_id = current_user["tenant_id"]
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute(
            """SELECT trace_id as request_id, query as task, iterations, '{}'::jsonb as tools_executed, 0 as results_count,
                      total_ms, finish_reason, false as had_error, created_at
               FROM agent_request_traces
               WHERE tenant_id = %s
               ORDER BY created_at DESC
               LIMIT %s""",
            (tenant_id, limit),
        )
        rows = cur.fetchall()
        conn.close()
        return {
            "tenant_id": tenant_id,
            "count": len(rows),
            "traces": [
                {
                    "request_id": r[0], "task": r[1], "iterations": r[2],
                    "tools_executed": r[3], "results_count": r[4],
                    "total_ms": r[5], "finish_reason": r[6],
                    "had_error": r[7], "created_at": str(r[8]),
                }
                for r in rows
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/metrics/agent", tags=["Observability"])
async def get_metrics(
    current_user: dict = Depends(get_agent_tenant),
):
    """Métricas de convergencia del agente (solo si user es analista/admin)."""
    import psycopg2
    from app.db.trace_service import DATABASE_URL
    
    # Nota: Para producción, agregar validación de rol
    # if current_user.get("rol") not in ["analista", "admin"]:
    #     raise HTTPException(status_code=403, detail="No autorizado")
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute(
            """SELECT tenant_id, finish_reason,
                      COUNT(*) AS total,
                      ROUND(AVG(iterations)::numeric, 2) AS avg_iter,
                      ROUND(AVG(total_ms)::numeric, 0) AS avg_ms,
                      SUM(CASE WHEN finish_reason = 'error' THEN 1 ELSE 0 END) AS errors
               FROM agent_request_traces
               WHERE tenant_id = %s
               GROUP BY tenant_id, finish_reason
               ORDER BY total DESC""",
            (current_user["tenant_id"],)
        )
        rows = cur.fetchall()
        conn.close()
        return {
            "tenant_id": current_user["tenant_id"],
            "metrics": [
                {
                    "finish_reason": r[1], "total": r[2],
                    "avg_iterations": float(r[3] or 0.0), "avg_ms": float(r[4] or 0.0), "errors": r[5],
                }
                for r in rows
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# GET /agent/config — configuración del agente para el frontend
# ---------------------------------------------------------------------------

@app.get("/agent/config", tags=["Agent"], response_model=dict)
async def get_agent_config(current_user: dict = Depends(get_agent_tenant)):
    """
    Retorna la configuración del agente para el tenant autenticado.

    Esta información la usa el frontend para mostrar:
    - Nombre y descripción del negocio
    - Tono del agente
    - Propósito principal
    - Servicios disponibles
    - Sedes y horarios
    - Coberturas (obras sociales, prepagas)
    - Acciones habilitadas/prohibidas
    """
    tenant_id = current_user["tenant_id"]
    try:
        from core.config import settings
        conn = psycopg2.connect(settings.database_url)
        cur = conn.cursor()

        # Datos del tenant
        cur.execute(
            "SELECT nombre, descripcion, config FROM tenants WHERE id = %s",
            (tenant_id,)
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Tenant no encontrado")

        nombre, descripcion, config = row
        config = config or {}

        # Servicios
        cur.execute(
            "SELECT nombre, categoria, descripcion FROM tenant_servicios WHERE tenant_id = %s",
            (tenant_id,)
        )
        servicios = [
            {"nombre": r[0], "categoria": r[1], "descripcion": r[2]}
            for r in cur.fetchall()
        ]

        # Sedes
        cur.execute(
            "SELECT nombre, direccion, telefonos, mail, horario_semana, horario_sabado, coberturas_disponibles FROM tenant_sedes WHERE tenant_id = %s",
            (tenant_id,)
        )
        sedes = []
        for r in cur.fetchall():
            sedes.append({
                "nombre": r[0],
                "direccion": r[1],
                "telefonos": json.loads(r[2]) if r[2] else [],
                "mail": r[3],
                "horario_semana": r[4],
                "horario_sabado": r[5],
                "coberturas_disponibles": r[6],
            })

        # Coberturas
        cur.execute(
            "SELECT nombre, activa, sedes_disponibles FROM tenant_coberturas WHERE tenant_id = %s",
            (tenant_id,)
        )
        coberturas = [
            {"nombre": r[0], "activa": r[1], "sedes_disponibles": json.loads(r[2]) if r[2] else []}
            for r in cur.fetchall()
        ]

        # Routing rules
        cur.execute(
            "SELECT patron, estrategia, config FROM tenant_routing_rules WHERE tenant_id = %s",
            (tenant_id,)
        )
        routing_rules = [
            {"patron": r[0], "estrategia": r[1], "config": r[2]}
            for r in cur.fetchall()
        ]

        conn.close()

        return {
            "tenant_id": tenant_id,
            "nombre": nombre,
            "descripcion": descripcion,
            "config": config,
            "servicios": servicios,
            "sedes": sedes,
            "coberturas": coberturas,
            "routing_rules": routing_rules,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo config para {tenant_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)