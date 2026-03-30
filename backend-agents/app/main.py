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
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.engine.langgraph_engine import LangGraphEngine
from app.lib.logging_utils import setup_structured_logging, trace_id_var
from app.models import (
    AgentRequest,
    AgentResponse,
    ErrorResponse,
    TraceStepType,
    create_tracing_context,
)
from app.auth.agent_auth import get_user_by_api_key
from app.db.trace_service import persist_trace, ensure_traces_table
from app.onboarding_router import router as onboarding_router  # /onboarding/ingest (procesamiento con LLM)
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

import uuid
import logging
import time

# Initialize structured logs
setup_structured_logging()
logger = logging.getLogger(__name__)

# Rate limiting setup
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Webshooks - Agent Engine API")

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
    """
    Dependency para /agent/execute.
    Prioridad:
      1. X-API-Key → user dict del sistema (tenant_id del token)
      2. ALLOW_FALLBACK_TENANT=true → testing bypass
      3. Sin auth → 401
    """
    api_key = request.headers.get("X-API-Key")
    if api_key:
        user = await get_user_by_api_key(api_key)
        if not user:
            raise HTTPException(status_code=401, detail="API Key inválida o usuario inactivo")
        return user

    if os.getenv("ALLOW_FALLBACK_TENANT") == "true":
        fallback_tenant = os.getenv("DEFAULT_TENANT_ID", "default")
        return {"tenant_id": fallback_tenant, "rol": "cliente", "email": "fallback"}

    raise HTTPException(
        status_code=401,
        detail="Autenticación requerida. Usá X-API-Key: <tu_api_key>",
        headers={"WWW-Authenticate": "ApiKey"},
    )


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
    
    Ejecuta el agente con LangGraph + Ollama + Qdrant.
    """
    start_time = time.time()
    effective_tenant_id = current_user.get("tenant_id") or req.tenant_id

    trace_id = str(uuid.uuid4())
    logger.info(f"[TRACE START] {trace_id} | tenant={effective_tenant_id}")

    try:
        query_clean = req.query.strip()
        malicious_patterns = ["ignore previous instructions", "system override", "bypass safety"]
        if any(p in query_clean.lower() for p in malicious_patterns):
            raise HTTPException(status_code=400, detail="Identified potentially malicious input pattern.")

        engine = LangGraphEngine(tenant_id=effective_tenant_id)
        
        agent_exec_start = time.time()
        result, metadata = await asyncio.wait_for(
            engine.run(task=query_clean), timeout=60.0
        )
        agent_exec_ms = int((time.time() - agent_exec_start) * 1000)

        background_tasks.add_task(
            persist_trace,
            trace_id=trace_id,
            tenant_id=effective_tenant_id,
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
            tenant_id=effective_tenant_id,
            query=req.query,
            iterations=metadata.get("iterations", 0),
            result=result,
            metadata=metadata
        )

        logger.info(f"[TRACE END] {trace_id} | duration={agent_exec_ms}ms")
        return response

    except HTTPException:
        raise
    except asyncio.TimeoutError:
        background_tasks.add_task(
            persist_trace,
            trace_id=trace_id,
            tenant_id=effective_tenant_id,
            query=req.query,
            iterations=0,
            result=[],
            metadata={"total_ms": 60000, "finish_reason": "timeout"}
        )
        return AgentResponse(trace_id=trace_id, tenant_id=effective_tenant_id, query=req.query, iterations=0, result=[], metadata={"error": "timeout"})
        
    except Exception as e:
        background_tasks.add_task(
            persist_trace,
            trace_id=trace_id,
            tenant_id=effective_tenant_id,
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)