from fastapi import APIRouter, HTTPException, Request

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/tenants/{tenant_id}/overview")
def tenant_overview(request: Request, tenant_id: str):
    user = request.state.user

    if user.get("type") != "admin":
        raise HTTPException(status_code=403, detail="ADMIN_REQUIRED")

    return {"tenant_id": tenant_id, "usage": 1200, "errors": 3, "health": "ok"}
