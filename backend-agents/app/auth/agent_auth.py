"""
app/auth/agent_auth.py - Autenticación API Key para Agent Service
"""
import os
from typing import Optional, Dict, Any
from fastapi import HTTPException, Header, Depends


import os
import psycopg2
import logging
from typing import Optional
from fastapi import HTTPException, Header

logger = logging.getLogger(__name__)
DB_DSN = os.getenv("DATABASE_URL", "postgresql://postgres:Karaoke27570Echeverria@localhost:5432/agencia_web_b2b")

async def get_user_by_api_key(x_api_key: Optional[str] = Header(None)) -> dict:
    """
    Validar API Key contra PostgreSQL y retornar usuario en formato dict.
    """
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API Key requerida (X-API-Key header)")
    
    try:
        conn = psycopg2.connect(DB_DSN)
        cur = conn.cursor()
        cur.execute("""
            SELECT id, email, name, role, "defaultTenantId", status
            FROM "User" WHERE "apiKey" = %s
        """, (x_api_key,))
        row = cur.fetchone()
        conn.close()
        
        if not row:
            raise HTTPException(status_code=401, detail="API Key inválida")
            
        id_, email, nombre, rol, tenant_id, status = row
        if status != "ACTIVE":
            raise HTTPException(status_code=401, detail="Usuario inactivo")
            
        return {
            "id": id_,
            "email": email,
            "nombre": nombre or "Usuario",
            "rol": rol.lower() if rol else "member",
            "tenant_id": tenant_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error auth DB: {e}")
        raise HTTPException(status_code=500, detail="Error interno verificando auth")

def validate_tenant_access(user: dict, tenant_id: str) -> bool:
    """
    Validar que usuario puede acceder a este tenant.
    """
    rol = user.get("rol", "")
    if rol in ("admin", "superadmin", "super_admin"):
        return True
    
    if rol == "cliente" and user.get("tenant_id") == tenant_id:
        return True
    
    return False
