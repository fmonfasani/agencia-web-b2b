# Production-Grade SaaS Base (FastAPI + PostgreSQL + Redis)

Esta carpeta recrea la arquitectura solicitada para una base SaaS multi-tenant:

- FastAPI como API layer
- PostgreSQL como source of truth
- Redis para cache, sessions y quota counters
- Tenant isolation con middleware
- Auth JWT + RBAC base (admin/member)

## Estructura

```text
/app
  main.py
  core/
    config.py
    security.py
    database.py
    redis.py
  models/
    user.py
    tenant.py
    api_key.py
    usage.py
  schemas/
    auth.py
  services/
    auth_service.py
    usage_service.py
  middleware/
    auth.py
    tenant.py
  api/
    admin.py
    tenant.py
    auth.py
```

## Endpoints base

- `POST /api/auth/login`
- `GET /api/admin/tenants/{tenant_id}/overview`
- `GET /api/tenant/{tenant_id}/usage`
- `GET /health`

## Ejemplos frontend

- Admin: `apiFetch("/api/admin/tenants/t_123/overview")`
- Cliente: `apiFetch("/api/tenant/t_123/usage")`

## Siguiente nivel recomendado

1. Refresh tokens + revocation list en Redis
2. Hashing de passwords con bcrypt/argon2
3. API keys con rotación y expiración
4. RBAC real (tabla de permisos) + ABAC policy engine
5. Pipeline de usage asíncrono con Kafka
6. Billing exacto e idempotency keys
