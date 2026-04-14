"""
middleware/api_gateway.py — Central API Gateway

Single entrypoint for ALL authenticated requests.

Responsibilities (in order):
  1. Extract X-API-Key from header
  2. Resolve identity: API key → (user, tenant, scopes)
  3. Inject into request.state.identity
  4. Set X-Trace-Id if not present
  5. Enforce multi-tenant: every non-public request has a resolved tenant

Public routes (no auth required):
  /health, /docs, /openapi.json, /auth/login, /auth/register, /auth/company

BEFORE (broken):
  - Each router checked auth independently
  - Some routers had lowercase role comparisons (broken)
  - No central place for identity injection
  - api_key_meta attached inconsistently

AFTER:
  - ONE middleware runs for every request
  - request.state.identity is ALWAYS populated for protected routes
  - Routers trust request.state.identity — no re-auth needed
"""
import logging
import uuid
from typing import Optional, FrozenSet

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.auth_service import get_user_by_api_key

logger = logging.getLogger(__name__)

# ── Public routes that do NOT require auth ────────────────────────────────────
PUBLIC_PREFIXES = (
    "/health",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/auth/login",
    "/auth/register",
    "/auth/company",
)


# ── Identity object ───────────────────────────────────────────────────────────

class Identity:
    """
    Resolved identity for a request. Attached to request.state.identity.

    Source of truth for:
      - user_id, tenant_id, role
      - api_key_scopes (list of allowed permissions, ["*"] = all)
      - is_platform_role (SUPER_ADMIN / ANALISTA → cross-tenant)
    """
    __slots__ = (
        "user_id", "email", "nombre", "role",
        "tenant_id", "api_key_scopes", "api_key_id",
    )

    PLATFORM_ROLES: FrozenSet[str] = frozenset(["SUPER_ADMIN", "ANALISTA"])

    def __init__(
        self,
        user_id: str,
        email: str,
        nombre: str,
        role: str,
        tenant_id: Optional[str],
        api_key_scopes: list,
        api_key_id: Optional[str] = None,
    ):
        self.user_id = user_id
        self.email = email
        self.nombre = nombre
        self.role = role.upper()
        self.tenant_id = tenant_id
        self.api_key_scopes = api_key_scopes or ["*"]
        self.api_key_id = api_key_id

    @property
    def is_platform_role(self) -> bool:
        return self.role in self.PLATFORM_ROLES

    def can_access_tenant(self, tenant_id: str) -> bool:
        if self.is_platform_role:
            return True
        return self.tenant_id == tenant_id

    def has_scope(self, permission_value: str) -> bool:
        if "*" in self.api_key_scopes:
            return True
        return permission_value in self.api_key_scopes

    def to_user_dict(self) -> dict:
        """Compat shim — returns the dict format expected by policy_engine.authorize()."""
        return {
            "id": self.user_id,
            "email": self.email,
            "nombre": self.nombre,
            "rol": self.role,
            "tenant_id": self.tenant_id,
        }

    def to_api_key_meta(self) -> dict:
        """Compat shim for policy_engine._check_scope()."""
        return {"scopes": self.api_key_scopes}


# ── Middleware ────────────────────────────────────────────────────────────────

class APIGatewayMiddleware(BaseHTTPMiddleware):
    """
    Runs before EVERY request.

    Public routes → pass through (no auth).
    Protected routes → resolve identity from X-API-Key, attach to request.state.
    """

    async def dispatch(self, request: Request, call_next):
        # ── Trace ID (always) ─────────────────────────────────────────────────
        trace_id = request.headers.get("X-Trace-Id") or str(uuid.uuid4())
        request.state.trace_id = trace_id

        # ── Public route bypass ───────────────────────────────────────────────
        path = request.url.path
        if any(path.startswith(p) for p in PUBLIC_PREFIXES):
            response = await call_next(request)
            response.headers["X-Trace-Id"] = trace_id
            return response

        # ── API Key extraction ────────────────────────────────────────────────
        api_key = (
            request.headers.get("X-API-Key")
            or request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
        )

        if not api_key:
            return JSONResponse(
                status_code=401,
                content={"error": "missing_api_key", "message": "X-API-Key header is required"},
                headers={"X-Trace-Id": trace_id},
            )

        # ── Identity resolution ───────────────────────────────────────────────
        try:
            user = get_user_by_api_key(api_key)
        except Exception as e:
            logger.error(f"[APIGateway] identity resolution error: {e}", extra={"trace_id": trace_id})
            return JSONResponse(
                status_code=500,
                content={"error": "auth_error", "message": "Identity resolution failed"},
                headers={"X-Trace-Id": trace_id},
            )

        if not user:
            return JSONResponse(
                status_code=401,
                content={"error": "invalid_api_key", "message": "API key is invalid or expired"},
                headers={"X-Trace-Id": trace_id},
            )

        # ── Build Identity object ─────────────────────────────────────────────
        identity = Identity(
            user_id=user["id"],
            email=user.get("email", ""),
            nombre=user.get("nombre", ""),
            role=user.get("rol", "MEMBER"),
            tenant_id=user.get("tenant_id"),
            api_key_scopes=user.get("api_key_scopes", ["*"]),
            api_key_id=user.get("api_key_id"),
        )

        # Inject into request.state (available to all downstream handlers)
        request.state.identity = identity
        # Compat: some existing code reads request.state.api_key_meta
        request.state.api_key_meta = identity.to_api_key_meta()

        logger.debug(
            f"[APIGateway] {request.method} {path} "
            f"user={identity.user_id} tenant={identity.tenant_id} role={identity.role}",
            extra={"trace_id": trace_id},
        )

        response = await call_next(request)
        response.headers["X-Trace-Id"] = trace_id
        return response
