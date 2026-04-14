"""
core/policy_engine.py — Central RBAC + ABAC Policy Engine

Reemplaza TODOS los if user["rol"] == ... hardcodeados.

Uso:
    from app.core.policy_engine import authorize, Permission, PolicyViolation

    # En un endpoint:
    authorize(user, Permission.AGENTS_EXECUTE, resource={"tenant_id": tenant_id})

    # Como FastAPI dependency con scope mínimo:
    user = Depends(require_permission(Permission.BILLING_READ))
"""
from enum import Enum
from typing import Optional, Any, Dict
from fastapi import HTTPException, Depends, Request

from app.auth_router import get_current_user


# ── 1. Permission Registry ────────────────────────────────────────────────────

class Permission(str, Enum):
    # Agents
    AGENTS_EXECUTE       = "agents.execute"
    AGENTS_READ          = "agents.read"
    AGENTS_WRITE         = "agents.write"          # create / update instance
    AGENTS_DELETE        = "agents.delete"

    # Templates (platform only)
    TEMPLATES_READ       = "templates.read"
    TEMPLATES_WRITE      = "templates.write"

    # Training / RAG
    TRAINING_UPLOAD      = "training.upload"
    TRAINING_INGEST      = "training.ingest"       # trigger RAG pipeline
    TRAINING_DELETE      = "training.delete"

    # Observability
    TRACES_READ_OWN      = "traces.read.own"
    TRACES_READ_ALL      = "traces.read.all"       # cross-tenant
    METRICS_READ_OWN     = "metrics.read.own"
    METRICS_READ_ALL     = "metrics.read.all"

    # Billing
    BILLING_READ         = "billing.read"
    BILLING_WRITE        = "billing.write"         # change plan, quotas

    # Tenant management
    TENANT_READ_OWN      = "tenant.read.own"
    TENANT_READ_ALL      = "tenant.read.all"       # list all tenants
    TENANT_WRITE         = "tenant.write"          # update own tenant
    TENANT_ADMIN         = "tenant.admin"          # platform-level ops

    # Users / team
    USERS_READ           = "users.read"
    USERS_INVITE         = "users.invite"
    USERS_MANAGE         = "users.manage"          # activate / deactivate

    # Analytics
    ANALYTICS_OWN        = "analytics.own"
    ANALYTICS_GLOBAL     = "analytics.global"

    # API Keys
    APIKEYS_MANAGE       = "apikeys.manage"

    # Platform ops (Control Panel only)
    IMPERSONATE          = "platform.impersonate"
    PLATFORM_ADMIN       = "platform.admin"


# ── 2. Role → Permission matrix ───────────────────────────────────────────────

ROLE_PERMISSIONS: Dict[str, frozenset] = {

    "SUPER_ADMIN": frozenset(p for p in Permission),  # everything

    "ANALISTA": frozenset([
        Permission.AGENTS_EXECUTE,
        Permission.AGENTS_READ,
        Permission.AGENTS_WRITE,
        Permission.TEMPLATES_READ,
        Permission.TEMPLATES_WRITE,
        Permission.TRAINING_UPLOAD,
        Permission.TRAINING_INGEST,
        Permission.TRAINING_DELETE,
        Permission.TRACES_READ_ALL,
        Permission.METRICS_READ_ALL,
        Permission.ANALYTICS_GLOBAL,
        Permission.ANALYTICS_OWN,
        Permission.TENANT_READ_ALL,
        Permission.TENANT_WRITE,
        Permission.APIKEYS_MANAGE,
        Permission.IMPERSONATE,
        Permission.BILLING_READ,
    ]),

    "ADMIN": frozenset([
        Permission.AGENTS_EXECUTE,
        Permission.AGENTS_READ,
        Permission.AGENTS_WRITE,
        Permission.AGENTS_DELETE,
        Permission.TEMPLATES_READ,
        Permission.TRAINING_UPLOAD,
        Permission.TRAINING_INGEST,
        Permission.TRACES_READ_OWN,
        Permission.METRICS_READ_OWN,
        Permission.ANALYTICS_OWN,
        Permission.BILLING_READ,
        Permission.BILLING_WRITE,
        Permission.TENANT_READ_OWN,
        Permission.TENANT_WRITE,
        Permission.USERS_READ,
        Permission.USERS_INVITE,
        Permission.USERS_MANAGE,
        Permission.APIKEYS_MANAGE,
    ]),

    "MEMBER": frozenset([
        Permission.AGENTS_EXECUTE,
        Permission.AGENTS_READ,
        Permission.AGENTS_WRITE,
        Permission.TEMPLATES_READ,
        Permission.TRAINING_UPLOAD,
        Permission.TRACES_READ_OWN,
        Permission.ANALYTICS_OWN,
        Permission.APIKEYS_MANAGE,       # only own key
    ]),

    "CLIENTE": frozenset([
        Permission.AGENTS_EXECUTE,
        Permission.TEMPLATES_READ,
    ]),

    "VIEWER": frozenset([
        Permission.AGENTS_READ,
        Permission.METRICS_READ_OWN,
        Permission.ANALYTICS_OWN,
        Permission.TRACES_READ_OWN,
    ]),
}

# Platform roles can operate cross-tenant
PLATFORM_ROLES = frozenset(["SUPER_ADMIN", "ANALISTA"])


# ── 3. ABAC context evaluators ────────────────────────────────────────────────

def _check_tenant_ownership(user: dict, resource: dict) -> bool:
    """
    ABAC rule: a non-platform user can only access resources in their own tenant.
    """
    role = (user.get("rol") or "").upper()
    if role in PLATFORM_ROLES:
        return True
    resource_tenant = resource.get("tenant_id")
    if not resource_tenant:
        return True   # no tenant constraint on resource
    return user.get("tenant_id") == resource_tenant


def _check_scope(api_key_meta: Optional[dict], permission: Permission) -> bool:
    """
    ABAC rule: API key scopes ALWAYS limit the effective permission set.

    Authority rule (canonical):
        effective_permissions = role_permissions ∩ api_key_scopes

    This means:
      - A ADMIN user with api_key scopes=["agents.read"] can ONLY read agents,
        even though their role grants agents.write, billing.write, etc.
      - An api_key with scopes=["*"] grants full role permissions (no restriction).
      - A session without an api_key (direct login) is unrestricted by scopes.

    There is NO way to escalate via API key — scopes can only restrict, never expand.
    """
    if not api_key_meta:
        return True  # Browser/JWT session, not an API key request
    scopes = api_key_meta.get("scopes", ["*"])
    if "*" in scopes:
        return True
    return permission.value in scopes


# ── 4. Core authorize() function ─────────────────────────────────────────────

class PolicyViolation(HTTPException):
    def __init__(self, detail: str, permission: Permission):
        super().__init__(
            status_code=403,
            detail={"error": "policy_violation", "required": permission.value, "message": detail},
        )


def authorize(
    user: dict,
    permission: Permission,
    resource: Optional[Dict[str, Any]] = None,
    api_key_meta: Optional[dict] = None,
) -> None:
    """
    Evaluate RBAC + ABAC policy.

    Raises PolicyViolation (HTTP 403) if:
    - User's role doesn't grant the permission
    - API key scopes don't include the permission
    - ABAC: non-platform user tries to access another tenant's resource

    Args:
        user:         User dict from get_current_user()
        permission:   The Permission required for this action
        resource:     Optional dict with resource attributes (tenant_id, owner_id, …)
        api_key_meta: Optional API key metadata for scope enforcement
    """
    role = (user.get("rol") or "MEMBER").upper()
    granted = ROLE_PERMISSIONS.get(role, frozenset())

    # 1. RBAC check
    if permission not in granted:
        raise PolicyViolation(
            f"Role '{role}' does not have permission '{permission.value}'",
            permission,
        )

    # 2. Scope check (API key scopes)
    if not _check_scope(api_key_meta, permission):
        raise PolicyViolation(
            f"API key scope does not include '{permission.value}'",
            permission,
        )

    # 3. ABAC: tenant ownership
    if resource and not _check_tenant_ownership(user, resource):
        raise PolicyViolation(
            f"Cross-tenant access denied for tenant '{resource.get('tenant_id')}'",
            permission,
        )


# ── 5. FastAPI dependency factories ──────────────────────────────────────────

def require_permission(
    permission: Permission,
    resource_getter=None,   # optional callable(request) → dict with tenant_id etc.
):
    """
    FastAPI dependency factory.

    Usage:
        @router.get("/traces")
        async def get_traces(
            user: dict = Depends(require_permission(Permission.TRACES_READ_OWN))
        ):
    """
    async def _dep(
        request: Request,
        user: dict = Depends(get_current_user),
    ) -> dict:
        resource = resource_getter(request) if resource_getter else {}
        api_key_meta = request.state.__dict__.get("api_key_meta")
        authorize(user, permission, resource=resource, api_key_meta=api_key_meta)
        return user

    return _dep


def require_platform_role():
    """Shortcut for SUPER_ADMIN or ANALISTA."""
    return require_permission(Permission.PLATFORM_ADMIN)


# ── 6. Convenience helpers (replaces old hardcoded checks) ───────────────────

def is_platform_role(user: dict) -> bool:
    return (user.get("rol") or "").upper() in PLATFORM_ROLES


def can_access_tenant(user: dict, tenant_id: str) -> bool:
    """True if user can access data belonging to tenant_id."""
    if is_platform_role(user):
        return True
    return user.get("tenant_id") == tenant_id


def resolve_tenant_id(user: dict, requested_tenant_id: Optional[str]) -> str:
    """
    Returns the effective tenant_id for a request.
    - Platform roles: use requested_tenant_id (or own if not provided)
    - Tenant roles: always use their own tenant_id (ignore requested)
    """
    if is_platform_role(user) and requested_tenant_id:
        return requested_tenant_id
    tenant_id = user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(400, "Usuario sin tenant asignado")
    return tenant_id
