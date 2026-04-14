"""
agent_instances_router.py — CRUD de instancias de agentes por tenant.
ADMIN/MEMBER pueden crear instancias en su tenant.
SUPER_ADMIN/ANALISTA pueden operar en cualquier tenant.
"""
import logging
import json
import re
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import psycopg2

from app.auth_router import get_current_user
from app.onboarding_service import _get_db_dsn

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agent-instances", tags=["Agent Instances"])

# ── Pydantic models ───────────────────────────────────────────────────────────

class AgentInstanceCreate(BaseModel):
    template_id: str
    name: str = Field(..., min_length=2, max_length=200)
    custom_prompt: Optional[str] = Field(None, max_length=3000)
    knowledge_base_id: Optional[str] = None
    overrides: Dict[str, Any] = {}


class AgentInstanceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    custom_prompt: Optional[str] = Field(None, max_length=3000)
    knowledge_base_id: Optional[str] = None
    overrides: Optional[Dict[str, Any]] = None
    status: Optional[str] = None  # active | paused | archived


# ── Helpers ───────────────────────────────────────────────────────────────────

def _require_write_access(user: dict):
    role = (user.get("rol") or "").upper()
    if role not in ("SUPER_ADMIN", "ANALISTA", "ADMIN", "MEMBER"):
        raise HTTPException(403, "Se requiere rol ADMIN o MEMBER")


def _resolve_tenant(user: dict, requested_tenant_id: Optional[str] = None) -> str:
    """Platform roles pueden especificar tenant_id; otros solo ven el suyo."""
    role = (user.get("rol") or "").upper()
    is_platform = role in ("SUPER_ADMIN", "ANALISTA")
    if is_platform and requested_tenant_id:
        return requested_tenant_id
    tenant_id = user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(400, "Usuario sin tenant asignado")
    return tenant_id


def _row_to_instance(row, cols) -> dict:
    d = dict(zip(cols, row))
    for f in ("overrides", "config"):
        if isinstance(d.get(f), str):
            d[f] = json.loads(d[f])
    return d


def _generate_instance_id(tenant_id: str, template_id: str) -> str:
    """Genera ID legible: inst_<tenant_slug>_<template_type>_<short_uuid>"""
    slug = re.sub(r"[^a-z0-9]", "", tenant_id.lower())[:12]
    tpl_slug = template_id.replace("tpl_", "").split("_")[0][:10]
    import uuid
    short = uuid.uuid4().hex[:6]
    return f"inst_{slug}_{tpl_slug}_{short}"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=None, summary="Listar instancias del tenant")
async def list_instances(
    tenant_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    resolved_tenant = _resolve_tenant(current_user, tenant_id)
    conn = psycopg2.connect(_get_db_dsn())
    cur = conn.cursor()
    try:
        query = """
            SELECT i.*, t.type as template_type, t.name as template_name,
                   t.description as template_description, t.tools, t.config_base
            FROM agent_instances i
            LEFT JOIN agent_templates t ON t.id = i.template_id
            WHERE i.tenant_id = %s
        """
        params = [resolved_tenant]
        if status:
            query += " AND i.status = %s"
            params.append(status)
        query += " ORDER BY i.created_at DESC"
        cur.execute(query, params)
        cols = [d[0] for d in cur.description]
        rows = cur.fetchall()
        result = []
        for row in rows:
            d = _row_to_instance(row, cols)
            # Merge tools/config_base from template (they come as JSON from DB)
            for f in ("tools", "config_base"):
                if isinstance(d.get(f), str):
                    d[f] = json.loads(d[f])
            result.append(d)
        return result
    finally:
        cur.close()
        conn.close()


@router.get("/{instance_id}", response_model=None, summary="Obtener instancia por ID")
async def get_instance(
    instance_id: str,
    current_user: dict = Depends(get_current_user),
):
    conn = psycopg2.connect(_get_db_dsn())
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT i.*, t.type as template_type, t.name as template_name,
                   t.description as template_description, t.base_prompt,
                   t.tools, t.config_base
            FROM agent_instances i
            LEFT JOIN agent_templates t ON t.id = i.template_id
            WHERE i.id = %s
        """, (instance_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, f"Instancia '{instance_id}' no encontrada")
        cols = [d[0] for d in cur.description]
        d = _row_to_instance(row, cols)

        # Validate tenant access
        role = (current_user.get("rol") or "").upper()
        is_platform = role in ("SUPER_ADMIN", "ANALISTA")
        if not is_platform and d["tenant_id"] != current_user.get("tenant_id"):
            raise HTTPException(403, "Acceso denegado")

        for f in ("tools", "config_base"):
            if isinstance(d.get(f), str):
                d[f] = json.loads(d[f])
        return d
    finally:
        cur.close()
        conn.close()


@router.post("", response_model=None, summary="Crear instancia desde template")
async def create_instance(
    body: AgentInstanceCreate,
    tenant_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    _require_write_access(current_user)
    resolved_tenant = _resolve_tenant(current_user, tenant_id)

    conn = psycopg2.connect(_get_db_dsn())
    cur = conn.cursor()
    try:
        # Validate template exists and is active
        cur.execute(
            "SELECT id, type FROM agent_templates WHERE id = %s AND is_active = true",
            (body.template_id,)
        )
        tpl = cur.fetchone()
        if not tpl:
            raise HTTPException(404, f"Template '{body.template_id}' no encontrado o inactivo")

        # Default knowledge_base_id to tenant_id (main collection)
        kb_id = body.knowledge_base_id or resolved_tenant

        instance_id = _generate_instance_id(resolved_tenant, body.template_id)

        cur.execute("""
            INSERT INTO agent_instances
              (id, tenant_id, template_id, name, custom_prompt,
               knowledge_base_id, overrides, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, 'active')
            RETURNING *
        """, (
            instance_id, resolved_tenant, body.template_id, body.name,
            body.custom_prompt, kb_id, json.dumps(body.overrides),
        ))
        cols = [d[0] for d in cur.description]
        row = cur.fetchone()
        conn.commit()
        return _row_to_instance(row, cols)
    finally:
        cur.close()
        conn.close()


@router.patch("/{instance_id}", response_model=None, summary="Actualizar instancia")
async def update_instance(
    instance_id: str,
    body: AgentInstanceUpdate,
    current_user: dict = Depends(get_current_user),
):
    _require_write_access(current_user)

    # Verify ownership first
    conn = psycopg2.connect(_get_db_dsn())
    cur = conn.cursor()
    try:
        cur.execute("SELECT tenant_id FROM agent_instances WHERE id = %s", (instance_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "Instancia no encontrada")

        role = (current_user.get("rol") or "").upper()
        is_platform = role in ("SUPER_ADMIN", "ANALISTA")
        if not is_platform and row[0] != current_user.get("tenant_id"):
            raise HTTPException(403, "Acceso denegado")

        updates = {k: v for k, v in body.model_dump().items() if v is not None}
        if not updates:
            raise HTTPException(400, "No hay campos para actualizar")
        updates["updated_at"] = datetime.utcnow()

        set_clauses = []
        values = []
        for k, v in updates.items():
            if k == "overrides":
                set_clauses.append(f"{k} = %s::jsonb")
                values.append(json.dumps(v))
            else:
                set_clauses.append(f"{k} = %s")
                values.append(v)
        values.append(instance_id)

        cur.execute(
            f"UPDATE agent_instances SET {', '.join(set_clauses)} WHERE id = %s RETURNING *",
            values,
        )
        cols = [d[0] for d in cur.description]
        updated = cur.fetchone()
        conn.commit()
        return _row_to_instance(updated, cols)
    finally:
        cur.close()
        conn.close()


@router.delete("/{instance_id}", response_model=None, summary="Archivar instancia")
async def delete_instance(
    instance_id: str,
    current_user: dict = Depends(get_current_user),
):
    role = (current_user.get("rol") or "").upper()
    if role not in ("SUPER_ADMIN", "ANALISTA", "ADMIN"):
        raise HTTPException(403, "Solo ADMIN puede eliminar instancias")

    conn = psycopg2.connect(_get_db_dsn())
    cur = conn.cursor()
    try:
        cur.execute("SELECT tenant_id FROM agent_instances WHERE id = %s", (instance_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "Instancia no encontrada")

        is_platform = role in ("SUPER_ADMIN", "ANALISTA")
        if not is_platform and row[0] != current_user.get("tenant_id"):
            raise HTTPException(403, "Acceso denegado")

        # Soft delete — archive instead of hard delete
        cur.execute(
            "UPDATE agent_instances SET status = 'archived', updated_at = NOW() WHERE id = %s",
            (instance_id,)
        )
        conn.commit()
        return {"success": True, "id": instance_id, "status": "archived"}
    finally:
        cur.close()
        conn.close()
