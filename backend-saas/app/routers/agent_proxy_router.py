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
from app.models.agent_request_model import AgentRequest

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
    summary="Execute agent (proxied to backend-agents)",
    description="""
Executes the intelligent agent with RAG context.

This endpoint proxies the request to backend-agents:8001/agent/execute.
The API key is validated locally, then the request is forwarded with the same trace_id.
    """,
    response_model=dict,
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
        # Use trace_id from request or generate new
        trace_id = request.headers.get("X-Trace-Id")
        headers = {"X-Trace-Id": trace_id} if trace_id else {}

        result = await proxy.forward(
            "POST",
            AGENT_EXECUTE_PATH,
            json=req.dict(exclude_none=True),
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
    summary="Get agent configuration (proxied)",
    description="Returns tenant configuration: services, locations, coverages, routing rules.",
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
    summary="Get agent traces (proxied)",
    description="Returns recent execution traces for the tenant.",
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
    summary="Get agent metrics (proxied)",
    description="Returns convergence metrics for the tenant.",
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
