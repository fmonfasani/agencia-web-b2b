"""
tenant_router.py — Endpoints for tenant management
"""
import logging
import json
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
import psycopg2

from app.tenant_models import TenantCreateRequest, TenantUpdateRequest, TenantResponse, TenantListResponse
from app.auth_router import get_current_user, require_analista_or_admin
from app.onboarding_service import _get_db_dsn

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tenant", tags=["Tenant Management"])


@router.get(
    "/me",
    summary="Obtener mi tenant actual",
    description="""
Retorna la información del tenant del usuario autenticado junto con los datos del usuario.
Requiere API Key válida en header X-API-Key.
    """,
    response_model=dict,
)
async def get_current_tenant(user: dict = Depends(get_current_user)):
    """Get the authenticated user's tenant and membership info."""
    try:
        conn = psycopg2.connect(_get_db_dsn())
        cur = conn.cursor()

        tenant_id = user.get("tenant_id")
        if not tenant_id:
            conn.close()
            raise HTTPException(status_code=400, detail="User has no default tenant")

        # Get tenant info
        cur.execute("""
            SELECT id, name, slug, website, status, branding
            FROM "Tenant" WHERE id = %s
        """, (tenant_id,))
        tenant_row = cur.fetchone()

        if not tenant_row:
            conn.close()
            raise HTTPException(status_code=404, detail="Tenant not found")

        tenant_id_, name, slug, website, status, branding_json = tenant_row

        # Parse branding
        branding = {}
        if branding_json:
            try:
                if isinstance(branding_json, str):
                    branding = json.loads(branding_json)
                else:
                    branding = branding_json
            except Exception as e:
                logger.warning(f"Failed to parse branding for tenant {tenant_id}: {e}")

        conn.close()

        return {
            "user": {
                "id": user["id"],
                "email": user["email"],
                "nombre": user["nombre"],
                "role": user["rol"],
            },
            "tenant": {
                "id": tenant_id_,
                "name": name,
                "slug": slug,
                "website": website,
                "status": status,
                "branding": branding,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting current tenant: {e}")
        raise HTTPException(status_code=500, detail="Error fetching tenant info")


@router.get(
    "",
    summary="Listar tenants [ANALISTA+]",
    description="""
Lista todos los tenants de la plataforma. Solo analistas y admins.
    """,
    response_model=TenantListResponse,
)
async def list_tenants(_: dict = Depends(require_analista_or_admin)):
    try:
        conn = psycopg2.connect(_get_db_dsn())
        cur = conn.cursor()

        cur.execute("SELECT COUNT(*) FROM tenants")
        total = cur.fetchone()[0]

        cur.execute("""
            SELECT id, nombre, industria, descripcion, created_at, updated_at, activo
            FROM tenants
            ORDER BY created_at DESC
        """)
        rows = cur.fetchall()
        conn.close()

        tenants = [
            TenantResponse(
                id=row[0],
                nombre=row[1],
                industria=row[2],
                descripcion=row[3],
                created_at=row[4],
                updated_at=row[5],
                activo=row[6],
            )
            for row in rows
        ]

        return TenantListResponse(total=total, tenants=tenants)
    except Exception as e:
        logger.error(f"Error listing tenants: {e}")
        raise HTTPException(status_code=500, detail="Error interno al listar tenants")


@router.get(
    "/{tenant_id}",
    summary="Obtener detalles del tenant [ANALISTA+]",
    description="Retorna los datos completos de un tenant específico.",
    response_model=TenantResponse,
)
async def get_tenant(tenant_id: str, _: dict = Depends(require_analista_or_admin)):
    try:
        conn = psycopg2.connect(_get_db_dsn())
        cur = conn.cursor()

        cur.execute("""
            SELECT id, nombre, industria, descripcion, created_at, updated_at, activo
            FROM tenants
            WHERE id = %s
        """, (tenant_id,))
        row = cur.fetchone()
        conn.close()

        if not row:
            raise HTTPException(status_code=404, detail=f"Tenant '{tenant_id}' no encontrado")

        return TenantResponse(
            id=row[0],
            nombre=row[1],
            industria=row[2],
            descripcion=row[3],
            created_at=row[4],
            updated_at=row[5],
            activo=row[6],
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting tenant {tenant_id}: {e}")
        raise HTTPException(status_code=500, detail="Error interno al obtener el tenant")


@router.put(
    "/{tenant_id}",
    summary="Actualizar tenant [ANALISTA+]",
    description="Actualiza nombre, industria o descripción de un tenant.",
    response_model=TenantResponse,
)
async def update_tenant(
    tenant_id: str,
    req: TenantUpdateRequest,
    _: dict = Depends(require_analista_or_admin),
):
    try:
        conn = psycopg2.connect(_get_db_dsn())
        cur = conn.cursor()

        # Check existence
        cur.execute("SELECT id FROM tenants WHERE id = %s", (tenant_id,))
        if not cur.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail=f"Tenant '{tenant_id}' no encontrado")

        # Update
        updates = {}
        if req.nombre is not None:
            updates["nombre"] = req.nombre
        if req.industria is not None:
            updates["industria"] = req.industria
        if req.descripcion is not None:
            updates["descripcion"] = req.descripcion

        if not updates:
            # No changes requested
            cur.execute("""
                SELECT id, nombre, industria, descripcion, created_at, updated_at, activo
                FROM tenants WHERE id = %s
            """, (tenant_id,))
            row = cur.fetchone()
            conn.close()
            return TenantResponse(
                id=row[0], nombre=row[1], industria=row[2], descripcion=row[3],
                created_at=row[4], updated_at=row[5], activo=row[6],
            )

        updates["updated_at"] = datetime.utcnow()
        set_clause = ", ".join([f"{k} = %s" for k in updates.keys()])
        values = list(updates.values()) + [tenant_id]

        cur.execute(f"UPDATE tenants SET {set_clause} WHERE id = %s", values)
        conn.commit()

        # Fetch updated
        cur.execute("""
            SELECT id, nombre, industria, descripcion, created_at, updated_at, activo
            FROM tenants WHERE id = %s
        """, (tenant_id,))
        row = cur.fetchone()
        conn.close()

        return TenantResponse(
            id=row[0], nombre=row[1], industria=row[2], descripcion=row[3],
            created_at=row[4], updated_at=row[5], activo=row[6],
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating tenant {tenant_id}: {e}")
        raise HTTPException(status_code=500, detail="Error interno al actualizar el tenant")
