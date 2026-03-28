from fastapi import Request, HTTPException, Depends
from typing import Optional
import os
from jose import jwt, JWTError

AUTH_SECRET = os.getenv("AUTH_SECRET", "placeholder-secret")

def get_session_token(request: Request) -> Optional[str]:
    """Extracts session token from secure or insecure cookies."""
    # Production uses __Secure-authjs.session-token
    # Development uses authjs.session-token
    secure_name = "__Secure-authjs.session-token"
    dev_name = "authjs.session-token"
    
    return request.cookies.get(secure_name) or request.cookies.get(dev_name)

def decode_nextauth_jwt(token: str) -> dict:
    """Decodes NextAuth.js JWT using the AUTH_SECRET."""
    try:
        # NextAuth.js uses HS256 by default for JWE/JWT if AUTH_SECRET is provided
        return jwt.decode(token, AUTH_SECRET, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid session token.")

async def get_current_tenant(request: Request) -> str:
    """Dependency to extract tenant_id from validated session."""
    token = get_session_token(request)
    if not token:
        # Fallback for local testing if explicitly allowed via env
        fallback = os.getenv("DEFAULT_TENANT_ID")
        if fallback and os.getenv("ALLOW_FALLBACK_TENANT") == "true":
            return fallback
        raise HTTPException(status_code=401, detail="No session token found.")
    
    payload = decode_nextauth_jwt(token)
    tenant_id = payload.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=403, detail="Session does not contain a tenant ID.")
        
    return tenant_id
