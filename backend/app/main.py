import sys
import os
import asyncio
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request, Depends

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.engine.langgraph_engine import LangGraphEngine
from app.lib.auth_utils import get_current_tenant
from app.lib.logging_utils import setup_structured_logging, trace_id_var, scrub_sensitive_data
from app.models import (
    AgentRequest,
    AgentResponse,
    ErrorResponse,
    TraceStepType,
    create_tracing_context,
)
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
app = FastAPI(title="Agencia B2B - Multi-tenant Agent API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


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
    return {"status": "ok"}


@app.post("/agent/execute", response_model=AgentResponse)
@limiter.limit("10/minute")
async def execute(
    req: AgentRequest,
    request: Request,
    session_tenant_id: str = Depends(get_current_tenant),
):
    # 1. Crear contexto de trazabilidad
    ctx = create_tracing_context(
        tenant_id=req.tenant_id,
        query=req.query,
        enable_detailed_trace=req.enable_detailed_trace,
        trace_id=req.trace_id,
    )

    print(f"[TRACE START] {ctx.trace_id} | tenant={req.tenant_id}")

    try:
        # 2. Validación con tracing
        with ctx.trace_step("validation", TraceStepType.VALIDATION):
            # Multi-tenant cross-validation
            if os.getenv("ALLOW_FALLBACK_TENANT") == "true":
                effective_tenant_id = req.tenant_id
            else:
                if req.tenant_id != session_tenant_id:
                    print(
                        f"SECURITY ALERT: Tenant mismatch. "
                        f"Request: {req.tenant_id} | Session: {session_tenant_id}"
                    )
                    raise HTTPException(
                        status_code=403,
                        detail="Tenant ID mismatch or unauthorized access.",
                    )
                effective_tenant_id = session_tenant_id

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
        result, metadata = await asyncio.wait_for(
            engine.run(query_clean), timeout=60.0
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
