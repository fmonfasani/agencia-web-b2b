from fastapi import HTTPException, Request


def resolve_tenant(request: Request, tenant_id: str) -> str:
    user = request.state.user

    if user["type"] == "admin":
        return tenant_id

    if user["tenant_id"] != tenant_id:
        raise HTTPException(status_code=403, detail="FORBIDDEN")

    return tenant_id
