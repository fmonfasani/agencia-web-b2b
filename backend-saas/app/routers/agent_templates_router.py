"""
agent_templates_router.py — CRUD de templates globales de agentes.
Solo SUPER_ADMIN y ANALISTA pueden crear/editar templates.
Todos los usuarios autenticados pueden listar/ver templates activos.
"""
import logging
import uuid
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import psycopg2

from app.auth_router import get_current_user
from app.onboarding_service import _get_db_dsn

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agent-templates", tags=["Agent Templates"])


# ── Pydantic models ───────────────────────────────────────────────────────────

class AgentTemplateCreate(BaseModel):
    id: str = Field(..., description="ID único, ej: tpl_ventas_v2")
    type: str = Field(..., description="recepcionista | ventas | soporte | informativo")
    name: str
    description: Optional[str] = None
    base_prompt: str
    tools: List[str] = ["search"]
    config_base: Dict[str, Any] = {"max_iterations": 5, "temperature": 0.7}
    version: str = "1.0.0"


class AgentTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    base_prompt: Optional[str] = None
    tools: Optional[List[str]] = None
    config_base: Optional[Dict[str, Any]] = None
    version: Optional[str] = None
    is_active: Optional[bool] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _require_platform_role(user: dict):
    role = (user.get("rol") or "").upper()
    if role not in ("SUPER_ADMIN", "ANALISTA"):
        raise HTTPException(403, "Solo SUPER_ADMIN o ANALISTA pueden gestionar templates")


def _row_to_template(row, cols) -> dict:
    d = dict(zip(cols, row))
    for f in ("tools", "config_base"):
        if isinstance(d.get(f), str):
            d[f] = json.loads(d[f])
    return d


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=None, summary="Listar templates activos")
async def list_templates(
    include_inactive: bool = False,
    current_user: dict = Depends(get_current_user),
):
    role = (current_user.get("rol") or "").upper()
    is_platform = role in ("SUPER_ADMIN", "ANALISTA")

    conn = psycopg2.connect(_get_db_dsn())
    cur = conn.cursor()
    try:
        if include_inactive and is_platform:
            cur.execute("SELECT * FROM agent_templates ORDER BY type, version")
        else:
            cur.execute("SELECT * FROM agent_templates WHERE is_active = true ORDER BY type, version")
        cols = [d[0] for d in cur.description]
        return [_row_to_template(r, cols) for r in cur.fetchall()]
    finally:
        cur.close()
        conn.close()


@router.get("/{template_id}", response_model=None, summary="Obtener template por ID")
async def get_template(
    template_id: str,
    current_user: dict = Depends(get_current_user),
):
    conn = psycopg2.connect(_get_db_dsn())
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM agent_templates WHERE id = %s", (template_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, f"Template '{template_id}' no encontrado")
        cols = [d[0] for d in cur.description]
        return _row_to_template(row, cols)
    finally:
        cur.close()
        conn.close()


@router.post("", response_model=None, summary="Crear template (solo platform roles)")
async def create_template(
    body: AgentTemplateCreate,
    current_user: dict = Depends(get_current_user),
):
    _require_platform_role(current_user)
    conn = psycopg2.connect(_get_db_dsn())
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO agent_templates
              (id, type, name, description, base_prompt, tools, config_base, version, created_by)
            VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s, %s)
            RETURNING *
        """, (
            body.id, body.type, body.name, body.description, body.base_prompt,
            json.dumps(body.tools), json.dumps(body.config_base),
            body.version, current_user.get("id"),
        ))
        cols = [d[0] for d in cur.description]
        row = cur.fetchone()
        conn.commit()
        return _row_to_template(row, cols)
    except psycopg2.IntegrityError:
        conn.rollback()
        raise HTTPException(409, f"Template con id '{body.id}' ya existe")
    finally:
        cur.close()
        conn.close()


@router.patch("/{template_id}", response_model=None, summary="Actualizar template")
async def update_template(
    template_id: str,
    body: AgentTemplateUpdate,
    current_user: dict = Depends(get_current_user),
):
    _require_platform_role(current_user)
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No hay campos para actualizar")

    updates["updated_at"] = datetime.utcnow()

    set_clauses = []
    values = []
    for k, v in updates.items():
        if k in ("tools", "config_base"):
            set_clauses.append(f"{k} = %s::jsonb")
            values.append(json.dumps(v))
        else:
            set_clauses.append(f"{k} = %s")
            values.append(v)
    values.append(template_id)

    conn = psycopg2.connect(_get_db_dsn())
    cur = conn.cursor()
    try:
        cur.execute(
            f"UPDATE agent_templates SET {', '.join(set_clauses)} WHERE id = %s RETURNING *",
            values,
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, f"Template '{template_id}' no encontrado")
        cols = [d[0] for d in cur.description]
        conn.commit()
        return _row_to_template(row, cols)
    finally:
        cur.close()
        conn.close()
