"""
Agent Proxy Router — Proxies requests to backend-agents.

Execution lifecycle is fully managed by ExecutionRuntime:
    auth (middleware) → authorize → quota_reserve → execute → usage_event → quota_commit

Each handler only needs to call execution_context() — no manual auth/quota code.
"""
import logging
import os
import httpx
from fastapi import APIRouter, Request, Depends, HTTPException, Query

from app.auth_router import get_current_user
from app.lib.proxy_client import ProxyClient
from app.models.agent_request_model import AgentRequest, AgentConfigResponse
from app.core.execution_runtime import execution_context
from app.core.circuit_breaker import requires_execution_runtime, safe_agent

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agent", tags=["Agent Proxy"])

BACKEND_AGENTS_URL = os.getenv("BACKEND_AGENTS_URL", "http://localhost:8001")
AGENT_EXECUTE_PATH = "/agent/execute"
AGENT_CONFIG_PATH  = "/agent/config"
AGENT_TRACES_PATH  = "/agent/traces"
AGENT_METRICS_PATH = "/metrics/agent"


async def get_proxy_client() -> ProxyClient:
    return ProxyClient(base_url=BACKEND_AGENTS_URL)


@router.post(
    "/execute",
    summary="Consultar al agente especializado",
    description="""
Ejecuta el agente inteligente con contexto RAG para responder consultas del tenant.

## Cómo funciona

1. El backend-saas valida tu API Key y permisos de tenant
2. Reenvía la consulta al backend-agents (interno, no expuesto externamente)
3. El agente busca contexto en Qdrant (RAG), llama al LLM, y retorna la respuesta

## Ejemplo — Consulta recepcionista

**Request:**
```json
{
  "query": "¿Qué seguros acepta la sede centro?",
  "tenant_id": "clinica-x-buenos-aires",
  "enable_detailed_trace": false,
  "max_iterations": 5,
  "temperature": 0.7
}
```

**Response (200 OK):**
```json
{
  "trace_id": "abc123-...",
  "tenant_id": "clinica-x-buenos-aires",
  "query": "¿Qué seguros acepta la sede centro?",
  "iterations": 2,
  "result": [
    {
      "role": "assistant",
      "content": "La sede centro acepta OSDE, Swiss Medical, Galeno y Medicina Prepaga. Atención: Lun-Vier 8-20hs, Sab 9-14hs."
    }
  ],
  "metadata": {
    "model": "qwen2.5:0.5b",
    "finish_reason": "finished",
    "rag_results_count": 3
  },
  "timestamp": "2026-04-02T12:34:56Z",
  "total_duration_ms": 2340
}
```

## Campos del request

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| query | string | ✅ | Consulta del usuario (3-2000 chars) |
| tenant_id | string | ✅ | ID del tenant (usa el tuyo si no lo enviás) |
| enable_detailed_trace | bool | ❌ | Incluir pasos detallados (default: false) |
| max_iterations | int | ❌ | Máx iteraciones del agente (1-10, default: 5) |
| temperature | float | ❌ | Temperatura LLM (0.0-2.0, default: 0.7) |

## Errores comunes

- `400`: tenant_id faltante o sin permiso sobre ese tenant
- `401`: API Key inválida o expirada
- `403`: Sin acceso al tenant
- `502`: backend-agents no disponible
    """,
    response_model=None,
)
@requires_execution_runtime
async def proxy_execute(
    req: AgentRequest,
    request: Request,
    proxy: ProxyClient = Depends(get_proxy_client),
):
    """
    Proxy for backend-agents /agent/execute.

    Lifecycle fully managed by ExecutionRuntime:
        identity (middleware) → authorize → quota_reserve → execute → quota_commit → usage_event

    @requires_execution_runtime: asserts identity exists before entering the handler.
    safe_agent(): wraps the backend call with a hard timeout (TIMEOUT_AGENT_S env, default 60s).
    """
    identity = getattr(request.state, "identity", None)
    tenant_id = req.tenant_id or (identity.tenant_id if identity else None)
    if not tenant_id:
        raise HTTPException(status_code=400, detail="tenant_id is required")

    async with execution_context(request, tenant_id=tenant_id) as rt:
        try:
            result = await safe_agent(
                lambda: proxy.forward(
                    "POST",
                    AGENT_EXECUTE_PATH,
                    json=req.model_dump(exclude_none=True),
                    headers={
                        "X-API-Key":  request.headers.get("X-API-Key", ""),
                        "X-Trace-Id": request.state.trace_id,
                    },
                )
            )
        except HTTPException:
            raise  # safe_agent raises 504 on timeout; let it propagate
        except httpx.HTTPError as e:
            logger.error(f"[proxy_execute] backend-agents error: {e}",
                         extra={"tenant_id": tenant_id})
            raise HTTPException(status_code=502, detail=f"Agent service unavailable: {e}")

        meta = result.get("metadata", {}) if isinstance(result, dict) else {}
        tokens_in  = int(meta.get("tokens_in")  or meta.get("prompt_tokens")     or 0)
        tokens_out = int(meta.get("tokens_out") or meta.get("completion_tokens") or 0)
        if tokens_in == 0 and tokens_out == 0:
            tokens_out = int(meta.get("tokens_used") or 500)

        rt.record_usage(
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            model=meta.get("model", "ollama/gemma3:latest"),
            agent_type=req.agent_instance_id or "default",
            trace_id=result.get("trace_id") if isinstance(result, dict) else None,
            session_id=getattr(req, "session_id", None),
            finish_reason=meta.get("finish_reason", "stop"),
        )

    return result


@router.get(
    "/providers",
    summary="Providers y modelos disponibles (Agent Lab)",
)
async def proxy_providers(
    request: Request,
    _: dict = Depends(get_current_user),
    proxy: ProxyClient = Depends(get_proxy_client),
):
    """Proxy for backend-agents /agent/providers — lista modelos Ollama/OpenRouter."""
    try:
        return await proxy.forward(
            "GET",
            "/agent/providers",
            headers={"X-API-Key": request.headers.get("X-API-Key")}
        )
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Agent service unavailable: {str(e)}")


@router.get(
    "/config",
    summary="Obtener configuración del agente",
    description="""
Retorna la configuración del tenant: nombre del negocio, servicios, sedes,
coberturas disponibles y reglas de routing del agente.

**Response ejemplo:**
```json
{
  "tenant_id": "clinica-x-buenos-aires",
  "nombre": "Clínica X - Buenos Aires",
  "servicios": ["Cardiología", "Pediatría", "Odontología"],
  "sedes": [
    {
      "nombre": "Sede Centro",
      "direccion": "Av. Corrientes 1234, CABA",
      "telefonos": ["1123456789"],
      "horario_semana": "Lun-Vier 8:00-20:00"
    }
  ],
  "coberturas": ["OSDE", "Swiss Medical", "Galeno", "Medicina Prepaga"]
}
```

Requiere `X-API-Key` con acceso al tenant.
    """,
    response_model=AgentConfigResponse,
)
async def proxy_config(
    request: Request,
    current_user: dict = Depends(get_current_user),
    proxy: ProxyClient = Depends(get_proxy_client),
):
    """Proxy for backend-agents /agent/config."""
    tenant_id = current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(
            status_code=403,
            detail=f"User role '{current_user.get('rol')}' does not have tenant access"
        )

    try:
        result = await proxy.forward(
            "GET",
            AGENT_CONFIG_PATH,
            headers={"X-API-Key": request.headers.get("X-API-Key")}
        )
        return result
    except httpx.HTTPError as e:
        trace_id = request.headers.get("X-Trace-Id", "unknown")
        logger.error(
            "Proxy error to backend-agents",
            extra={
                "trace_id": trace_id,
                "tenant_id": tenant_id,
                "error": str(e),
                "service": "agent_proxy_router"
            }
        )
        raise HTTPException(status_code=502, detail=f"Agent service unavailable: {str(e)}")


@router.get(
    "/traces",
    summary="Obtener trazas de ejecución (admin: todas; cliente: propias)",
    description="""
Retorna las últimas ejecuciones del agente para el tenant.
Útil para auditoría, debugging y observabilidad.

**Response ejemplo:**
```json
[
  {
    "trace_id": "abc123-xyz",
    "query": "¿Qué seguros aceptan?",
    "result": "Aceptamos OSDE, Swiss Medical, Galeno y Medicina Prepaga",
    "iterations": 2,
    "total_duration_ms": 1850,
    "timestamp": "2026-04-02T12:34:56Z",
    "success": true
  },
  {
    "trace_id": "def456-uvw",
    "query": "¿Cuál es el horario de atención?",
    "result": "Lunes a viernes 8:00 a 20:00. Sábados 9:00 a 14:00.",
    "iterations": 1,
    "total_duration_ms": 920,
    "timestamp": "2026-04-02T12:33:20Z",
    "success": true
  }
]
```

**Parámetro:**
- `limit`: número de trazas (1-100, default 50)
    """,
    response_model=None,
)
async def proxy_traces(
    request: Request,
    limit: int = Query(50, ge=1, le=100, description="Number of traces to return"),
    filter_tenant_id: str = Query(None, alias="tenant_id", description="Admin: filtrar por tenant específico"),
    current_user: dict = Depends(get_current_user),
    proxy: ProxyClient = Depends(get_proxy_client),
):
    """
    Proxy for backend-agents /agent/traces.
    - ADMIN/ANALISTA: ve todas las trazas (o filtra por tenant_id)
    - CLIENTE: solo sus propias trazas (tenant_id ignorado)
    """
    user_rol = (current_user.get("rol") or "").upper()
    is_admin = user_rol in ("ADMIN", "SUPER_ADMIN", "ANALISTA")

    if not is_admin and not current_user.get("tenant_id"):
        raise HTTPException(status_code=403, detail="Sin acceso a trazas")

    params: dict = {"limit": limit}
    if filter_tenant_id:
        params["tenant_id"] = filter_tenant_id

    try:
        result = await proxy.forward(
            "GET",
            AGENT_TRACES_PATH,
            params=params,
            headers={"X-API-Key": request.headers.get("X-API-Key")}
        )
        return result
    except httpx.HTTPError as e:
        trace_id = request.headers.get("X-Trace-Id", "unknown")
        logger.error(
            "Proxy error to backend-agents",
            extra={
                "trace_id": trace_id,
                "tenant_id": tenant_id,
                "error": str(e),
                "service": "agent_proxy_router"
            }
        )
        raise HTTPException(status_code=502, detail=f"Agent service unavailable: {str(e)}")


@router.get(
    "/metrics/agent",
    summary="Obtener métricas del agente",
    description="""
Retorna métricas de convergencia del agente para el tenant.
Incluye promedio de iteraciones, tiempo de respuesta y conteo de errores.

**Response ejemplo:**
```json
{
  "tenant_id": "clinica-x-buenos-aires",
  "avg_iterations": 2.3,
  "avg_duration_ms": 1920,
  "total_executions": 145,
  "error_count": 2,
  "success_rate": 0.986,
  "last_execution": "2026-04-02T12:34:56Z"
}
```

Útil para monitoreo y optimización del agente.
    """,
    response_model=dict,
)
async def proxy_metrics(
    request: Request,
    filter_tenant_id: str = Query(None, alias="tenant_id", description="Admin: filtrar por tenant específico"),
    current_user: dict = Depends(get_current_user),
    proxy: ProxyClient = Depends(get_proxy_client),
):
    """Proxy for backend-agents /metrics/agent. Admin/Analista ve todos los tenants."""
    user_rol = (current_user.get("rol") or "").upper()
    is_admin = user_rol in ("ADMIN", "SUPER_ADMIN", "ANALISTA")

    if not is_admin and not current_user.get("tenant_id"):
        raise HTTPException(status_code=403, detail="Sin acceso a métricas")

    params: dict = {}
    if filter_tenant_id:
        params["tenant_id"] = filter_tenant_id

    try:
        result = await proxy.forward(
            "GET",
            AGENT_METRICS_PATH,
            params=params if params else None,
            headers={"X-API-Key": request.headers.get("X-API-Key")}
        )
        return result
    except httpx.HTTPError as e:
        trace_id = request.headers.get("X-Trace-Id", "unknown")
        logger.error(
            "Proxy error to backend-agents",
            extra={
                "trace_id": trace_id,
                "tenant_id": tenant_id,
                "error": str(e),
                "service": "agent_proxy_router"
            }
        )
        raise HTTPException(status_code=502, detail=f"Agent service unavailable: {str(e)}")
