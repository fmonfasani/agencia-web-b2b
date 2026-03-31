from fastapi import APIRouter, Depends
from models.schemas import CreateKeyRequest
from core.auth import require_admin, generate_api_key
from core.database import get_conn

router = APIRouter(prefix="/admin/keys", tags=["admin"])

@router.post("/", dependencies=[Depends(require_admin)])
async def create_key(body: CreateKeyRequest):
    raw_key, key_hash = generate_api_key()
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO agent_api_keys (agent_id, key_hash, label) VALUES (%s, %s, %s) RETURNING id",
                (body.agent_id, key_hash, body.label)
            )
            conn.commit()
    return {"api_key": raw_key, "label": body.label, "warning": "Guardá esta key, no se muestra de nuevo"}

@router.delete("/{key_hash}", dependencies=[Depends(require_admin)])
async def revoke_key(key_hash: str):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE agent_api_keys SET active = false WHERE key_hash = %s", (key_hash,))
            conn.commit()
    return {"revoked": True}
