import hashlib
import secrets

from typing import Optional
from fastapi import Header, HTTPException

from core.config import settings
from core.database import verify_api_key


def hash_key(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def generate_api_key():
    raw = f"agk_{secrets.token_urlsafe(32)}"
    return raw, hash_key(raw)


def get_agent_from_key(x_api_key: str = Header(...)):
    agent = verify_api_key(hash_key(x_api_key))
    if not agent:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return agent


def require_admin(x_admin_secret: str = Header(...)):
    if x_admin_secret != settings.admin_secret:
        raise HTTPException(status_code=403, detail="Forbidden")


def require_internal_secret(
    x_internal_secret: Optional[str] = Header(None),
    x_admin_secret: Optional[str] = Header(None)
):
    if x_internal_secret == settings.internal_api_secret:
        return
    if x_admin_secret == settings.admin_secret:
        return
    raise HTTPException(status_code=401, detail="Unauthorized")
