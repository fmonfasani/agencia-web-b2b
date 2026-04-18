"""
auth/dependencies.py — Dependencias RBAC para FastAPI
Webshooks SaaS — Backend

Uso:
    from app.auth.dependencies import require_role, require_tenant_access, get_current_user

    @router.get("/endpoint")
    async def my_endpoint(user = Depends(require_role("ANALISTA"))):
        ...
"""

from enum import IntEnum
from fastapi import Depends, HTTPException, Security
from fastapi.security import APIKeyHeader
from app.db.pool import get_conn

# ─── Seguridad ────────────────────────────────────────────────────────────────

api_key_header = APIKeyHeader(
    name="X-API-Key",
    description="API Key obtenida en POST /auth/login. Formato: wh_xxxxx",
    auto_error=False,
)


# ─── Niveles jerárquicos de rol ───────────────────────────────────────────────

class RoleLevel(IntEnum):
    VIEWER     = 10
    MEMBER     = 20
    CLIENTE    = 40
    ANALISTA   = 60
    ADMIN      = 80
    SUPER_ADMIN = 100


# ─── Dependencias base ────────────────────────────────────────────────────────

async def get_current_user(
    api_key: str = Security(api_key_header),
) -> dict:
    """
    Dependencia base: valida la API Key y retorna el usuario activo.
    Lanza 401 si la key es inválida o el usuario está inactivo.
    """
    if not api_key:
        raise HTTPException(
            status_code=401,
            detail="API Key requerida. Obtela con POST /auth/login.",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, email, rol, tenant_id, activo
                FROM users
                WHERE api_key = %s
                """,
                (api_key,),
            )
            user = cur.fetchone()

    if not user or not user["activo"]:
        raise HTTPException(status_code=401, detail="API Key inválida o usuario inactivo")

    # Normalizar: el campo en DB se llama "rol" (español)
    # Exponemos también "role" para consistencia con el frontend
    user["role"] = user.get("rol", "CLIENTE").upper()
    return user


# ─── Dependencias con validación de rol ──────────────────────────────────────

def require_role(min_role: str):
    """
    Fábrica de dependencias: exige un rol mínimo jerárquico.

    Uso:
        user = Depends(require_role("ANALISTA"))
        user = Depends(require_role("ADMIN"))
        user = Depends(require_role("SUPER_ADMIN"))

    El rol del usuario debe ser >= al rol mínimo en RoleLevel.
    SUPER_ADMIN (100) > ADMIN (80) > ANALISTA (60) > CLIENTE (40) > MEMBER (20) > VIEWER (10)
    """
    try:
        min_level = RoleLevel[min_role.upper()].value
    except KeyError:
        raise ValueError(f"Rol inválido: {min_role}. Válidos: {list(RoleLevel.__members__)}")

    async def check(user: dict = Depends(get_current_user)) -> dict:
        user_role = user.get("role", "CLIENTE").upper()
        try:
            user_level = RoleLevel[user_role].value
        except KeyError:
            raise HTTPException(
                status_code=403,
                detail=f"Rol desconocido: {user_role}",
            )

        if user_level < min_level:
            raise HTTPException(
                status_code=403,
                detail=f"Requiere rol {min_role} o superior (actual: {user_role})",
            )
        return user

    return check


def require_tenant_access():
    """
    Dependencia de aislamiento multi-tenant.

    - CLIENTE / MEMBER / VIEWER: solo acceden a su propio tenant_id.
    - ANALISTA / ADMIN / SUPER_ADMIN: acceso cross-tenant (cualquier tenant).

    El endpoint debe recibir tenant_id como path/query param.

    Uso:
        @router.get("/reports/{tenant_id}")
        async def get_reports(
            tenant_id: str,
            user = Depends(require_tenant_access()),
        ):
            ...
    """
    async def check(
        tenant_id: str,
        user: dict = Depends(get_current_user),
    ) -> dict:
        user_role = user.get("role", "CLIENTE").upper()
        try:
            user_level = RoleLevel[user_role].value
        except KeyError:
            user_level = RoleLevel.CLIENTE.value

        # ANALISTA+ puede cross-tenant
        if user_level >= RoleLevel.ANALISTA:
            return user

        # Otros roles solo su propio tenant
        if user.get("tenant_id") != tenant_id:
            raise HTTPException(
                status_code=403,
                detail="Sin acceso a este tenant",
            )

        return user

    return check


# ─── Shortcuts para los roles más comunes ────────────────────────────────────

def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """Shortcut: exige ADMIN o superior."""
    user_role = user.get("role", "CLIENTE").upper()
    try:
        level = RoleLevel[user_role].value
    except KeyError:
        level = 0
    if level < RoleLevel.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Solo administradores pueden realizar esta acción",
        )
    return user


def require_super_admin(user: dict = Depends(get_current_user)) -> dict:
    """Shortcut: exige SUPER_ADMIN."""
    user_role = user.get("role", "CLIENTE").upper()
    try:
        level = RoleLevel[user_role].value
    except KeyError:
        level = 0
    if level < RoleLevel.SUPER_ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Solo super administradores pueden realizar esta acción",
        )
    return user
