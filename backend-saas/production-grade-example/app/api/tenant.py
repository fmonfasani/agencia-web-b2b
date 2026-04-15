from fastapi import APIRouter, HTTPException, Request

from app.middleware.tenant import resolve_tenant
from app.services.usage_service import UsageService

router = APIRouter(prefix="/tenant", tags=["tenant"])


@router.get("/{tenant_id}/usage")
def tenant_usage(request: Request, tenant_id: str):
    tenant = resolve_tenant(request, tenant_id)

    if not UsageService.check_and_consume_quota(tenant, 50):
        raise HTTPException(status_code=429, detail="QUOTA_EXCEEDED")

    return {"tenant_id": tenant, "tokens_used": 5000}
