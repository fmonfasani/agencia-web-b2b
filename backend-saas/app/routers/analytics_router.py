"""
routers/analytics_router.py — Analytics API

GET /analytics/global   — platform-wide (SUPER_ADMIN / ANALISTA only)
GET /analytics/tenant   — per-tenant (own tenant; admin can query any)
"""
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth_router import get_current_user
from app.core.policy_engine import authorize, Permission
from app.core.analytics_aggregator import get_global_analytics, get_tenant_analytics

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/global", response_model=None, summary="Métricas globales de la plataforma")
async def analytics_global(
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    end_date:   Optional[str] = Query(None, description="YYYY-MM-DD"),
    current_user: dict = Depends(get_current_user),
):
    """Platform-wide analytics. Requires SUPER_ADMIN or ANALISTA role."""
    authorize(current_user, Permission.ANALYTICS_GLOBAL)
    return get_global_analytics(start_date=start_date, end_date=end_date)


@router.get("/tenant", response_model=None, summary="Métricas del tenant")
async def analytics_tenant(
    tenant_id: Optional[str] = Query(None, description="Admin: query another tenant"),
    months: int = Query(3, ge=1, le=12),
    current_user: dict = Depends(get_current_user),
):
    """Per-tenant analytics. Platform roles can query any tenant."""
    authorize(current_user, Permission.ANALYTICS_OWN)

    role = (current_user.get("rol") or "").upper()
    is_platform = role in ("SUPER_ADMIN", "ANALISTA")

    effective_tenant = tenant_id if (is_platform and tenant_id) else current_user.get("tenant_id")
    if not effective_tenant:
        raise HTTPException(status_code=400, detail="tenant_id required")

    # Non-platform users cannot query other tenants
    if not is_platform and tenant_id and tenant_id != current_user.get("tenant_id"):
        raise HTTPException(status_code=403, detail="Cross-tenant access denied")

    return get_tenant_analytics(effective_tenant, months=months)
