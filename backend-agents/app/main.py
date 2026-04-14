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
import httpx
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request, Depends, BackgroundTasks, Query
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.engine.langgraph_engine import LangGraphEngine
from app.llm.factory import get_llm_provider
from app.lib.logging_utils import setup_structured_logging, trace_id_var
from app.models import (
    AgentRequest,
    AgentResponse,
)
from app.auth.agent_auth import get_user_by_api_key, validate_tenant_access
from app.db.trace_service import persist_trace, ensure_traces_table
from app.session_service import (
    ensure_sessions_table,
    create_session,
    get_session_messages,
    append_messages as append_session_messages,
)
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
    ensure_sessions_table()


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


def _load_agent_instance(instance_id: str, tenant_id: str) -> dict:
    """Load agent_instance + template from DB. Returns merged config dict."""
    try:
        DATABASE_URL = os.environ.get("DATABASE_URL")
        if not DATABASE_URL:
            return {}
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute("""
            SELECT i.id, i.tenant_id, i.name, i.custom_prompt, i.knowledge_base_id,
                   i.overrides, i.status,
                   t.base_prompt, t.type, t.description, t.config_base, t.tools
            FROM agent_instances i
            LEFT JOIN agent_templates t ON t.id = i.template_id
            WHERE i.id = %s AND i.tenant_id = %s AND i.status = 'active'
        """, (instance_id, tenant_id))
        row = cur.fetchone()
        conn.close()
        if not row:
            return {}
        (inst_id, tid, name, custom_prompt, kb_id, overrides, status,
         base_prompt, tpl_type, tpl_desc, config_base, tools) = row

        import json as _json
        if isinstance(overrides, str):
            overrides = _json.loads(overrides)
        if isinstance(config_base, str):
            config_base = _json.loads(config_base)

        return {
            "instance_id": inst_id,
            "tenant_id": tid,
            "name": name,
            "custom_prompt": custom_prompt or "",
            "knowledge_base_id": kb_id or tenant_id,
            "overrides": overrides or {},
            "base_prompt": base_prompt or "",
            "template_type": tpl_type or "",
            "description": tpl_desc or "",
            "config_base": config_base or {},
        }
    except Exception as e:
        logger.warning(f"[_load_agent_instance] {e}")
        return {}


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

        # --- Session / conversation history ---
        session_id = req.conversation_id
        if session_id:
            # Validate it belongs to this tenant and load prior history
            conversation_history = get_session_messages(session_id, tenant_id)
        else:
            # Auto-create a new session for this conversation
            user_id = current_user.get("id")
            session_id = create_session(tenant_id, user_id)
            conversation_history = []

        # Load agent instance config if provided
        knowledge_base_id = None
        agent_config_override = None
        instance_meta = {}

        if req.agent_instance_id:
            instance_data = _load_agent_instance(req.agent_instance_id, tenant_id)
            if instance_data:
                knowledge_base_id = instance_data.get("knowledge_base_id")
                agent_config_override = {
                    "nombre": instance_data["name"],
                    "descripcion": instance_data.get("description", ""),
                    "base_prompt": instance_data.get("base_prompt", ""),
                    "custom_prompt": instance_data.get("custom_prompt", ""),
                    "tono": "profesional y cercano",
                    "fallback": "Comunicate con nosotros para más información.",
                }
                instance_meta = {
                    "agent_instance_id": req.agent_instance_id,
                    "template_type": instance_data.get("template_type", ""),
                }
                # Instance overrides for model/provider (request params take priority)
                inst_overrides = instance_data.get("overrides", {})
                if not req.model and inst_overrides.get("model"):
                    req.model = inst_overrides["model"]
                if not req.llm_provider and inst_overrides.get("llm_provider"):
                    req.llm_provider = inst_overrides["llm_provider"]
            else:
                logger.warning(f"[execute] agent_instance_id='{req.agent_instance_id}' not found for tenant={tenant_id}")

        # Obtener LLM provider (con override opcional del Agent Lab o la instancia)
        llm_provider = get_llm_provider(
            provider=req.llm_provider,
            model=req.model,
        )
        engine = LangGraphEngine(
            tenant_id=tenant_id,
            llm_provider=llm_provider,
            knowledge_base_id=knowledge_base_id,
            agent_config_override=agent_config_override,
        )

        agent_exec_start = time.time()
        result, metadata = await asyncio.wait_for(
            engine.run(task=query_clean, conversation_history=conversation_history),
            timeout=60.0,
        )
        agent_exec_ms = int((time.time() - agent_exec_start) * 1000)

        # Persist new messages from this turn to the session
        user_turn = {"role": "user", "content": query_clean}
        new_turns = [user_turn] + result
        background_tasks.add_task(append_session_messages, session_id, new_turns)

        background_tasks.add_task(
            persist_trace,
            trace_id=trace_id,
            tenant_id=tenant_id,
            query=query_clean,
            iterations=metadata.get("iterations", 0),
            result=result,
            metadata={
                **metadata,
                "model": req.model or metadata.get("model", settings.ollama_model),
                "total_ms": agent_exec_ms,
                "finish_reason": metadata.get("finish_reason", "success"),
                **instance_meta,
            }
        )

        response = AgentResponse(
            trace_id=trace_id,
            tenant_id=tenant_id,
            query=req.query,
            session_id=session_id,
            iterations=metadata.get("iterations", 0),
            result=result,
            metadata={**metadata, "model": req.model or metadata.get("model", "")},
            total_duration_ms=agent_exec_ms,
            timestamp_start=datetime.fromtimestamp(start_time),
            timestamp_end=datetime.utcnow(),
            x_process_time=str(process_time) if 'process_time' in locals() else None,
        )

        logger.info(f"[TRACE END] {trace_id} | session={session_id} | duration={agent_exec_ms}ms")
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
        logger.error(f"[EXECUTE] Unexpected error for tenant={tenant_id}: {e}")
        raise HTTPException(status_code=500, detail="Error interno del agente")


@app.get("/agent/traces", tags=["Agent"])
async def get_traces(
    limit: int = 50,
    filter_tenant: Optional[str] = Query(None, alias="tenant_id", description="Admin: filtrar por tenant. Sin valor = todos los tenants (solo admin/analista)"),
    current_user: dict = Depends(get_agent_tenant),
):
    """
    Retorna las últimas N trazas.
    - CLIENTE: solo ve sus propias trazas (tenant_id ignorado)
    - ADMIN/ANALISTA: puede ver todas o filtrar por tenant_id
    """
    import psycopg2
    from app.db.trace_service import DATABASE_URL

    user_rol = (current_user.get("rol") or "").lower()
    is_admin = user_rol in ("admin", "superadmin", "super_admin", "analista")

    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        if is_admin:
            if filter_tenant:
                # Admin filtered to specific tenant
                cur.execute(
                    """SELECT trace_id, query, iterations, result,
                              total_ms, finish_reason, metadata, created_at, tenant_id
                       FROM agent_request_traces
                       WHERE tenant_id = %s
                       ORDER BY created_at DESC LIMIT %s""",
                    (filter_tenant, limit),
                )
            else:
                # Admin sees all tenants
                cur.execute(
                    """SELECT trace_id, query, iterations, result,
                              total_ms, finish_reason, metadata, created_at, tenant_id
                       FROM agent_request_traces
                       ORDER BY created_at DESC LIMIT %s""",
                    (limit,),
                )
        else:
            # Cliente: only own tenant
            tenant_id = current_user["tenant_id"]
            cur.execute(
                """SELECT trace_id, query, iterations, result,
                          total_ms, finish_reason, metadata, created_at, tenant_id
                   FROM agent_request_traces
                   WHERE tenant_id = %s
                   ORDER BY created_at DESC LIMIT %s""",
                (tenant_id, limit),
            )

        rows = cur.fetchall()
        conn.close()
        return [
            {
                "id": r[0],
                "tenant_id": r[8],
                "query": r[1],
                "iterations": r[2],
                "result": r[3],
                "total_duration_ms": r[4],
                "metadata": {**(r[6] or {}), "finish_reason": r[5]},
                "created_at": str(r[7]),
            }
            for r in rows
        ]
    except Exception as e:
        logger.error(f"[TRACES] Error fetching traces for user={current_user.get('email')}: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener trazas")


@app.get("/metrics/agent", tags=["Observability"])
async def get_metrics(
    filter_tenant: Optional[str] = Query(None, alias="tenant_id", description="Admin: filtrar por tenant específico"),
    current_user: dict = Depends(get_agent_tenant),
):
    """
    Métricas agregadas del agente.
    - CLIENTE: métricas de su propio tenant
    - ADMIN/ANALISTA: métricas de todos los tenants (o uno específico via ?tenant_id=)
    Retorna formato compatible con dashboard frontend:
      total_executions, avg_duration_ms, success_rate, error_count, avg_iterations, last_execution
    """
    import psycopg2
    from app.db.trace_service import DATABASE_URL

    user_rol = (current_user.get("rol") or "").lower()
    is_admin = user_rol in ("admin", "superadmin", "super_admin", "analista")

    # Determine scope
    if is_admin and not filter_tenant:
        where_clause = ""
        params: tuple = ()
    elif is_admin and filter_tenant:
        where_clause = "WHERE tenant_id = %s"
        params = (filter_tenant,)
    else:
        where_clause = "WHERE tenant_id = %s"
        params = (current_user["tenant_id"],)

    ERROR_REASONS = ("error", "timeout", "embedding_error", "llm_error")

    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute(
            f"""SELECT
                  COUNT(*) AS total_executions,
                  COALESCE(ROUND(AVG(total_ms)::numeric, 0), 0) AS avg_duration_ms,
                  COALESCE(ROUND(AVG(iterations)::numeric, 2), 0) AS avg_iterations,
                  SUM(CASE WHEN finish_reason = ANY(%s) THEN 1 ELSE 0 END) AS error_count,
                  MAX(created_at) AS last_execution
               FROM agent_request_traces
               {where_clause}""",
            (list(ERROR_REASONS), *params),
        )
        row = cur.fetchone()

        # Per-tenant breakdown for admin (top 5 by volume)
        tenant_breakdown = []
        if is_admin:
            cur.execute(
                f"""SELECT tenant_id,
                          COUNT(*) AS total,
                          COALESCE(ROUND(AVG(total_ms)::numeric, 0), 0) AS avg_ms,
                          SUM(CASE WHEN finish_reason = ANY(%s) THEN 1 ELSE 0 END) AS errors
                   FROM agent_request_traces
                   {where_clause}
                   GROUP BY tenant_id
                   ORDER BY total DESC LIMIT 10""",
                (list(ERROR_REASONS), *params),
            )
            tenant_breakdown = [
                {"tenant_id": r[0], "total_executions": r[1], "avg_duration_ms": float(r[2]), "error_count": r[3]}
                for r in cur.fetchall()
            ]

        conn.close()

        total = int(row[0] or 0)
        error_count = int(row[3] or 0)
        success_rate = round((total - error_count) / max(total, 1), 4)

        return {
            "tenant_id": filter_tenant or (current_user["tenant_id"] if not is_admin else "all"),
            "total_executions": total,
            "avg_duration_ms": float(row[1] or 0),
            "avg_iterations": float(row[2] or 0),
            "error_count": error_count,
            "success_rate": success_rate,
            "last_execution": str(row[4]) if row[4] else None,
            "tenant_breakdown": tenant_breakdown,
        }
    except Exception as e:
        logger.error(f"[METRICS] Error fetching metrics for user={current_user.get('email')}: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener métricas")


# ---------------------------------------------------------------------------
# GET /agent/providers — lista de providers/modelos disponibles (Agent Lab)
# ---------------------------------------------------------------------------

@app.get("/agent/providers", tags=["Agent Lab"])
async def get_providers(_: dict = Depends(get_agent_tenant)):
    """
    Retorna los providers y modelos disponibles para el Agent Lab.
    Usado por el frontend para poblar los selectores de modelo en la comparación A/B.
    """
    # Fetch Ollama availability + model list in one request
    EMBED_KEYWORDS = ("embed", "nomic", "mxbai", "bge", "e5-")
    ollama_available = False
    ollama_models: list[str] = []
    try:
        async with httpx.AsyncClient(timeout=3.0) as _c:
            resp = await _c.get(f"{settings.ollama_base_url}/api/tags")
            if resp.status_code == 200:
                ollama_available = True
                raw_models = resp.json().get("models", [])
                ollama_models = [
                    m["name"] for m in raw_models
                    if not any(k in m["name"].lower() for k in EMBED_KEYWORDS)
                ]
    except Exception as exc:
        logger.warning(f"[PROVIDERS] Ollama not reachable: {exc}")
    if not ollama_models and ollama_available:
        ollama_models = [getattr(settings, "ollama_model", "qwen2.5:7b")]

    openrouter_keys = getattr(settings, "openrouter_api_keys", "") or ""
    openrouter_available = bool(openrouter_keys.strip())

    return {
        "current_provider": settings.llm_provider,
        "current_model": getattr(settings, "ollama_model", "qwen2.5:7b"),
        "providers": {
            "ollama": {
                "available": ollama_available,
                "base_url": settings.ollama_base_url,
                "models": ollama_models,
            },
            "openrouter": {
                "available": openrouter_available,
                "default_model": getattr(settings, "openrouter_default_model", "openai/gpt-3.5-turbo"),
                "models": [
                    "openai/gpt-4o-mini",
                    "openai/gpt-3.5-turbo",
                    "anthropic/claude-haiku",
                    "meta-llama/llama-3.1-8b-instruct",
                ],
            },
        },
    }


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
        logger.error(f"[CONFIG] Error obteniendo config para {tenant_id}: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener configuración del agente")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)