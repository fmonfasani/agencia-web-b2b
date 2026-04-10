"""
Notifications Router — Backend SaaS
Sistema de notificaciones in-app por usuario/tenant.
"""
import uuid
import logging
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from .training_service import get_conn

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notifications", tags=["notifications"])

NOTIFICATION_TYPES = {
    "training_ingested": "Documento ingestado",
    "training_failed": "Error en ingesta",
    "training_pending": "Documento pendiente de revisión",
    "agent_error": "Error en agente",
    "system": "Sistema",
}


# ── Pydantic models ───────────────────────────────────────────────────────────

class CreateNotificationRequest(BaseModel):
    user_id: Optional[str] = None
    tenant_id: str
    type: str
    title: str
    body: str


# ── Ensure table ──────────────────────────────────────────────────────────────

def ensure_notifications_table():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS notifications (
                    id VARCHAR(100) PRIMARY KEY,
                    tenant_id VARCHAR(100) NOT NULL,
                    user_id VARCHAR(100),
                    type VARCHAR(50) NOT NULL DEFAULT 'system',
                    title VARCHAR(200) NOT NULL,
                    body TEXT NOT NULL,
                    read BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_notif_tenant ON notifications (tenant_id, read, created_at DESC)
            """)
        conn.commit()


# ── Auth helper ───────────────────────────────────────────────────────────────

def _resolve_user(api_key: str) -> tuple[str, Optional[str]]:
    """Devuelve (user_id, tenant_id)."""
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'SELECT id, "defaultTenantId" FROM "User" WHERE "apiKey"=%s AND status=\'ACTIVE\' LIMIT 1',
                    (api_key,),
                )
                row = cur.fetchone()
                if row:
                    return str(row[0]), str(row[1]) if row[1] else None
    except Exception as e:
        logger.error("Could not resolve user: %s", e)
    raise HTTPException(401, "API key inválida o usuario inactivo")


def _get_api_key(request: Request) -> str:
    api_key = request.headers.get("X-API-Key") or request.headers.get("x-api-key")
    if not api_key:
        raise HTTPException(401, "API key requerida")
    return api_key


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("")
async def list_notifications(request: Request, limit: int = 20, unread_only: bool = False):
    """Lista las últimas notificaciones del usuario autenticado."""
    api_key = _get_api_key(request)
    user_id, tenant_id = _resolve_user(api_key)

    where = "WHERE (user_id = %s OR (tenant_id = %s AND user_id IS NULL))"
    params: list = [user_id, tenant_id]
    if unread_only:
        where += " AND read = FALSE"

    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT id, tenant_id, user_id, type, title, body, read, created_at
                    FROM notifications
                    {where}
                    ORDER BY created_at DESC
                    LIMIT %s
                    """,
                    params + [limit],
                )
                rows = cur.fetchall()
                # unread count
                cur.execute(
                    "SELECT COUNT(*) FROM notifications WHERE (user_id=%s OR (tenant_id=%s AND user_id IS NULL)) AND read=FALSE",
                    [user_id, tenant_id],
                )
                unread_count = cur.fetchone()[0]

        return {
            "notifications": [
                {
                    "id": r[0], "tenant_id": r[1], "user_id": r[2],
                    "type": r[3], "title": r[4], "body": r[5],
                    "read": r[6],
                    "created_at": r[7].isoformat() if r[7] else None,
                }
                for r in rows
            ],
            "unread_count": unread_count,
            "total": len(rows),
        }
    except Exception as e:
        logger.error("list_notifications error: %s", e)
        raise HTTPException(500, f"Error listando notificaciones: {e}")


@router.patch("/{notification_id}/read")
async def mark_read(notification_id: str, request: Request):
    """Marca una notificación como leída."""
    api_key = _get_api_key(request)
    user_id, _ = _resolve_user(api_key)

    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE notifications SET read=TRUE WHERE id=%s",
                    (notification_id,),
                )
            conn.commit()
        return {"success": True}
    except Exception as e:
        raise HTTPException(500, f"Error: {e}")


@router.post("/mark-all-read")
async def mark_all_read(request: Request):
    """Marca todas las notificaciones del usuario como leídas."""
    api_key = _get_api_key(request)
    user_id, tenant_id = _resolve_user(api_key)

    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE notifications SET read=TRUE WHERE (user_id=%s OR (tenant_id=%s AND user_id IS NULL))",
                    (user_id, tenant_id),
                )
            conn.commit()
        return {"success": True}
    except Exception as e:
        raise HTTPException(500, f"Error: {e}")


@router.post("/internal/create")
async def create_notification(body: CreateNotificationRequest):
    """
    Endpoint interno (service-to-service) para crear notificaciones.
    No requiere API key de usuario.
    """
    notif_id = str(uuid.uuid4())
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO notifications (id, tenant_id, user_id, type, title, body)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (notif_id, body.tenant_id, body.user_id,
                     body.type, body.title, body.body),
                )
            conn.commit()
        return {"success": True, "id": notif_id}
    except Exception as e:
        logger.error("create_notification error: %s", e)
        raise HTTPException(500, f"Error creando notificación: {e}")
