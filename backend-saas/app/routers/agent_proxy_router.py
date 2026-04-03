"""
Agent Proxy Router — Proxies requests to backend-agents.
All endpoints require X-API-Key auth and validate tenant access.
"""
import logging
import os
import httpx
from fastapi import APIRouter, Request, Depends, HTTPException, Query
from typing import Optional

from app.auth_router import get_current_user
from app.lib.proxy_client import ProxyClient
from app.models.agent_request_model import AgentRequest, AgentResponse, AgentConfigResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agent", tags=["Agent Proxy"])

# Backend-agents URL from env
BACKEND_AGENTS_URL = os.getenv("BACKEND_AGENTS_URL", "http://localhost:8001")

# Path constants
AGENT_EXECUTE_PATH = "/agent/execute"
AGENT_CONFIG_PATH = "/agent/config"
AGENT_TRACES_PATH = "/agent/traces"
AGENT_METRICS_PATH = "/metrics/agent"


async def get_proxy_client() -> ProxyClient:
    """Dependency: returns configured proxy client."""
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
    response_model=AgentResponse,
)
async def proxy_execute(
    req: AgentRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    proxy: ProxyClient = Depends(get_proxy_client),
):
    """
    Proxy for backend-agents /agent/execute.

    Validates:
    - User is active (via get_current_user)
    - User has access to requested tenant_id (admin can access any, cliente only own)
    """
    tenant_id = req.tenant_id or current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="tenant_id is required")

    # Validate tenant access
    user_rol = current_user.get("rol", "")
    if user_rol not in ("admin", "superadmin", "super_admin") and current_user.get("tenant_id") != tenant_id:
        raise HTTPException(
            status_code=403,
            detail=f"No permission to access tenant '{tenant_id}'"
        )

    # Forward to backend-agents
    try:
        # Propagate trace_id and API key to backend-agents for validation
        trace_id = request.headers.get("X-Trace-Id")
        api_key = request.headers.get("X-API-Key")
        headers = {}
        if trace_id:
            headers["X-Trace-Id"] = trace_id
        if api_key:
            headers["X-API-Key"] = api_key

        result = await proxy.forward(
            "POST",
            AGENT_EXECUTE_PATH,
            json=req.model_dump(exclude_none=True),
            headers=headers
        )
        return result
    except httpx.HTTPError as e:
        trace_id = request.headers.get("X-Trace-Id", "unknown")
        tenant_id = current_user.get("tenant_id", "unknown")
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
    summary="Obtener trazas de ejecución",
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
    response_model=dict,
)
async def proxy_traces(
    request: Request,
    limit: int = Query(50, ge=1, le=100, description="Number of traces to return"),
    current_user: dict = Depends(get_current_user),
    proxy: ProxyClient = Depends(get_proxy_client),
):
    """Proxy for backend-agents /agent/traces."""
    tenant_id = current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(
            status_code=403,
            detail=f"User role '{current_user.get('rol')}' does not have tenant access"
        )

    try:
        result = await proxy.forward(
            "GET",
            AGENT_TRACES_PATH,
            params={"limit": limit},
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
    current_user: dict = Depends(get_current_user),
    proxy: ProxyClient = Depends(get_proxy_client),
):
    """Proxy for backend-agents /metrics/agent."""
    tenant_id = current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(
            status_code=403,
            detail=f"User role '{current_user.get('rol')}' does not have tenant access"
        )

    try:
        result = await proxy.forward(
            "GET",
            AGENT_METRICS_PATH,
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
