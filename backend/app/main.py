import sys
import os
import asyncio
from fastapi import FastAPI, HTTPException, Request, Depends
from pydantic import BaseModel, Field

# Ensure 'app' is discoverable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.engine.langgraph_engine import LangGraphEngine
from app.lib.auth_utils import get_current_tenant
from app.lib.logging_utils import setup_structured_logging, trace_id_var, scrub_sensitive_data
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
        
        # Log request completion with scrubbing implicitly handled by formatter
        logger.info(
            f"Request completed: {request.method} {request.url.path}",
            extra={"status_code": response.status_code, "process_time": round(process_time, 4)}
        )
        return response
    finally:
        trace_id_var.reset(token)

class ExecuteRequest(BaseModel):
    task: str = Field(..., min_length=3, max_length=2000)
    tenant_id: str

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/agent/execute")
@limiter.limit("10/minute")
async def execute(
    req: ExecuteRequest, 
    request: Request,
    session_tenant_id: str = Depends(get_current_tenant)
):
    # 1. Multi-tenant Cross-Validation (MANDATORY in production)
    if os.getenv("ALLOW_FALLBACK_TENANT") == "true":
        # Dev/test fallback: no JWT session, trust request body tenant_id directly
        effective_tenant_id = req.tenant_id
    else:
        if req.tenant_id != session_tenant_id:
            print(f"SECURITY ALERT: Tenant mismatch. Request: {req.tenant_id} | Session: {session_tenant_id}")
            raise HTTPException(status_code=403, detail="Tenant ID mismatch or unauthorized access.")
        effective_tenant_id = session_tenant_id

    # 2. Sanitization
    task_clean = req.task.strip()

    # 3. Basic Prompt Injection Guard
    malicious_patterns = ["ignore previous instructions", "system override", "bypass safety"]
    if any(p in task_clean.lower() for p in malicious_patterns):
        raise HTTPException(status_code=400, detail="Identified potentially malicious input pattern.")

    try:
        # 4. Execution with Timeout (60 seconds — matches Ollama client timeout)
        engine = LangGraphEngine(tenant_id=effective_tenant_id)
        result, metadata = await asyncio.wait_for(engine.run(task_clean), timeout=60.0)
        return {"result": result, "metadata": metadata}

    except asyncio.TimeoutError:
        print(f"Aborting execution for {effective_tenant_id} due to timeout.")
        raise HTTPException(status_code=504, detail="Agent execution timed out.")
    except Exception as e:
        print(f"Execution failed for {effective_tenant_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
