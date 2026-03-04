import json
from fastapi import APIRouter, Depends
from models.schemas import CreateAgentRequest
from core.auth import require_admin
from core.database import get_conn

router = APIRouter(prefix="/admin/agents", tags=["admin"])

@router.post("/", dependencies=[Depends(require_admin)])
async def create_agent(body: CreateAgentRequest):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO agents (name, description, system_prompt, tenant_id) VALUES (%s, %s, %s, %s) RETURNING id",
                (body.name, body.description, body.system_prompt, body.tenant_id)
            )
            conn.commit()
            return {"id": cur.fetchone()["id"]}

@router.get("/", dependencies=[Depends(require_admin)])
async def list_agents():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, name, description, active, created_at FROM agents ORDER BY created_at DESC")
            return list(cur.fetchall())
