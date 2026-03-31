"""
app/auth/agent_auth.py - Autenticación API Key para Agent Service
"""
import os
from typing import Optional, Dict, Any
from fastapi import HTTPException, Header, Depends


VALID_API_KEYS = {
    "wh_admin_test": {
        "role": "admin",
        "tenant_id": None,
        "name": "Admin Test Key"
    },
    "wh_cliente_sistema_diagnostico": {
        "role": "cliente",
        "tenant_id": "tenant_sistema_diagnostico",
        "name": "Sistema Diagnostico"
    }
}


class APIKeyUser:
    """Representa un usuario autenticado por API Key"""
    def __init__(self, api_key: str, role: str, tenant_id: Optional[str], name: str):
        self.api_key = api_key
        self.role = role
        self.tenant_id = tenant_id
        self.name = name
    
    def __repr__(self):
        return f"APIKeyUser(role={self.role}, tenant={self.tenant_id})"


async def get_user_by_api_key(
    x_api_key: Optional[str] = Header(None)
) -> APIKeyUser:
    """
    Validar API Key y retornar usuario.
    
    Uso:
        @app.get("/endpoint")
        async def endpoint(user: APIKeyUser = Depends(get_user_by_api_key)):
            ...
    """
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API Key requerida (X-API-Key header)")
    
    if x_api_key not in VALID_API_KEYS:
        raise HTTPException(status_code=401, detail="API Key inválida")
    
    key_data = VALID_API_KEYS[x_api_key]
    
    return APIKeyUser(
        api_key=x_api_key,
        role=key_data["role"],
        tenant_id=key_data["tenant_id"],
        name=key_data["name"]
    )


def validate_tenant_access(user: APIKeyUser, tenant_id: str) -> bool:
    """
    Validar que usuario puede acceder a este tenant.
    """
    if user.role == "admin":
        return True
    
    if user.role == "cliente" and user.tenant_id == tenant_id:
        return True
    
    return False
