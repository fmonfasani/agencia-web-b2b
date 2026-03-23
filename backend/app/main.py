import sys
import os
import asyncio
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request, Depends, BackgroundTasks

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
from app.auth_router import router as auth_router, get_current_user, require_analista_or_admin
from app.auth_service import get_user_by_api_key
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.db.trace_service import persist_trace, ensure_traces_table
import uuid
import logging
import time

# Initialize structured logs
setup_structured_logging()
logger = logging.getLogger(__name__)

# Rate limiting setup
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Webshooks - Multi-tenant Agent API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Routers
from app.onboarding_router import router as onboarding_router
app.include_router(auth_router)
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
      1. X-API-Key → user dict del sistema interno (tenant_id del token)
      2. ALLOW_FALLBACK_TENANT=true → testing bypass (tenant_id del body)
      3. Sin auth → 401
    En producción solo opera el camino 1.
    """
    api_key = request.headers.get("X-API-Key")
    if api_key:
        user = get_user_by_api_key(api_key)
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
    return {"status": "ok"}


@app.post("/agent/execute", response_model=AgentResponse)
@limiter.limit("10/minute")
async def execute(
    req: AgentRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_agent_tenant),
):
    # tenant_id siempre del token/dependency — nunca del body en producción
    effective_tenant_id = current_user["tenant_id"]

    # 1. Crear contexto de trazabilidad
    ctx = create_tracing_context(
        tenant_id=effective_tenant_id,
        query=req.query,
        enable_detailed_trace=req.enable_detailed_trace,
        trace_id=req.trace_id,
    )

    print(f"[TRACE START] {ctx.trace_id} | tenant={effective_tenant_id}")

    try:
        # 2. Validación con tracing
        with ctx.trace_step("validation", TraceStepType.VALIDATION):
            # Sanitization
            query_clean = req.query.strip()

            # Prompt injection guard
            malicious_patterns = [
                "ignore previous instructions",
                "system override",
                "bypass safety",
            ]
            if any(p in query_clean.lower() for p in malicious_patterns):
                raise HTTPException(
                    status_code=400,
                    detail="Identified potentially malicious input pattern.",
                )

        # 3. Ejecutar agente con contexto de trazabilidad
        engine = LangGraphEngine(
            tenant_id=effective_tenant_id,
            tracing_context=ctx,
        )
        agent_exec_start = time.time()
        result, metadata = await asyncio.wait_for(
            engine.run(query_clean), timeout=60.0
        )
        agent_exec_ms = int((time.time() - agent_exec_start) * 1000)

        # 3b. Persistir trace en background (no bloquea el response)
        background_tasks.add_task(
            persist_trace,
            {
                "request_id": ctx.trace_id,
                "tenant_id": effective_tenant_id,
                "task": query_clean,
                "model": metadata.get("model", "qwen2.5:0.5b"),
                "iterations": metadata.get("iterations", 0),
                "llm_calls": metadata.get("llm_calls", 0),
                "tools_executed": metadata.get("tools_executed", []),
                "results_count": metadata.get("results_count", 0),
                "total_ms": agent_exec_ms,
                "embedding_ms": metadata.get("embedding_ms"),
                "rag_ms": metadata.get("rag_ms"),
                "llm_ms": metadata.get("llm_ms"),
                "tokens_used": metadata.get("tokens_used", 0),
                "finish_reason": metadata.get("finish_reason", ""),
                "error": metadata.get("error"),
            },
        )

        # 4. Finalizar trace
        ctx.add_step(
            step_id="response_complete",
            step_type=TraceStepType.RESPONSE_COMPLETE,
            output_data={
                "result_messages": len(result),
                "iterations": metadata.get("iterations"),
            },
        )

        if req.enable_detailed_trace:
            ctx.print_summary()

        # 5. Construir AgentResponse con trazabilidad
        response = AgentResponse(
            trace_id=ctx.trace_id,
            tenant_id=effective_tenant_id,
            query=req.query,
            iterations=metadata.get("iterations", 0),
            result=result,
            metadata=metadata,
            total_duration_ms=ctx.get_total_duration_ms(),
            timestamp_start=ctx.timestamp_start,
            timestamp_end=datetime.utcnow(),
            embedding_trace=ctx.embedding_traces if ctx.embedding_traces else None,
            qdrant_trace=ctx.qdrant_traces if ctx.qdrant_traces else None,
            rag_context_trace=ctx.rag_context_trace,
            llm_traces=ctx.llm_traces if ctx.llm_traces else None,
            trace=ctx.steps if req.enable_detailed_trace else None,
            x_process_time=f"{ctx.get_total_duration_ms()}ms",
        )

        print(f"[TRACE END] {ctx.trace_id} | duration={ctx.get_total_duration_ms()}ms")
        return response

    except HTTPException:
        raise

    except asyncio.TimeoutError:
        background_tasks.add_task(
            persist_trace,
            {
                "request_id": ctx.trace_id,
                "tenant_id": req.tenant_id,
                "task": req.query,
                "model": "qwen2.5:0.5b",
                "iterations": 0,
                "llm_calls": 0,
                "tools_executed": [],
                "results_count": 0,
                "total_ms": 60000,
                "embedding_ms": None,
                "rag_ms": None,
                "llm_ms": None,
                "tokens_used": 0,
                "finish_reason": "llm_error",
                "error": "TimeoutError: Agent execution timed out after 60s",
            },
        )
        error_resp = ErrorResponse(
            trace_id=ctx.trace_id,
            error_type="TimeoutError",
            error_message="Agent execution timed out after 60s",
            timestamp=datetime.utcnow(),
            failed_at_step="agent_execution",
            partial_trace=ctx.steps if req.enable_detailed_trace else None,
        )
        print(f"[TRACE ERROR] {ctx.trace_id} | Timeout")
        raise HTTPException(status_code=504, detail=error_resp.dict())

    except Exception as e:
        background_tasks.add_task(
            persist_trace,
            {
                "request_id": ctx.trace_id,
                "tenant_id": req.tenant_id,
                "task": req.query,
                "model": "qwen2.5:0.5b",
                "iterations": 0,
                "llm_calls": 0,
                "tools_executed": [],
                "results_count": 0,
                "total_ms": ctx.get_total_duration_ms(),
                "embedding_ms": None,
                "rag_ms": None,
                "llm_ms": None,
                "tokens_used": 0,
                "finish_reason": "llm_error",
                "error": f"{type(e).__name__}: {e}",
            },
        )
        error_resp = ErrorResponse(
            trace_id=ctx.trace_id,
            error_type=type(e).__name__,
            error_message=str(e),
            timestamp=datetime.utcnow(),
            failed_at_step="unknown",
            partial_trace=ctx.steps if req.enable_detailed_trace else None,
        )
        print(f"[TRACE ERROR] {ctx.trace_id} | {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=error_resp.dict())


# ---------------------------------------------------------------------------
# GET /agent/traces — últimas trazas del tenant autenticado
# ---------------------------------------------------------------------------

@app.get("/agent/traces", tags=["Agente"])
async def get_traces(
    limit: int = 50,
    current_user: dict = Depends(get_agent_tenant),
):
    """Retorna las últimas N trazas del tenant autenticado."""
    import psycopg2
    from app.db.trace_service import _DSN
    tenant_id = current_user["tenant_id"]
    try:
        conn = psycopg2.connect(_DSN)
        cur = conn.cursor()
        cur.execute(
            """SELECT request_id, task, iterations, tools_executed, results_count,
                      total_ms, finish_reason, had_error, created_at
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


# ---------------------------------------------------------------------------
# GET /metrics/agent — métricas agregadas [analista/admin]
# ---------------------------------------------------------------------------

@app.get("/metrics/agent", tags=["Observabilidad"])
async def get_metrics(
    current_user: dict = Depends(require_analista_or_admin),
):
    """Métricas de convergencia del agente por tenant y finish_reason."""
    import psycopg2
    from app.db.trace_service import _DSN
    try:
        conn = psycopg2.connect(_DSN)
        cur = conn.cursor()
        cur.execute(
            """SELECT tenant_id, finish_reason,
                      COUNT(*) AS total,
                      ROUND(AVG(iterations)::numeric, 2) AS avg_iter,
                      ROUND(AVG(total_ms)::numeric, 0) AS avg_ms,
                      SUM(CASE WHEN had_error THEN 1 ELSE 0 END) AS errors
               FROM agent_request_traces
               GROUP BY tenant_id, finish_reason
               ORDER BY tenant_id, total DESC"""
        )
        rows = cur.fetchall()
        conn.close()
        return {
            "metrics": [
                {
                    "tenant_id": r[0], "finish_reason": r[1], "total": r[2],
                    "avg_iterations": float(r[3]), "avg_ms": float(r[4]), "errors": r[5],
                }
                for r in rows
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# GET /tenant/me — info del tenant autenticado
# ---------------------------------------------------------------------------

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
