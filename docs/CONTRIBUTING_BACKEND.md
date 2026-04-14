# Guía de Contribución — Backends Python
> Última actualización: 2026-04-10

---

## Estructura del Repositorio

```
agencia-web-b2b/
├── backend-saas/       # API Gateway: auth, tenants, training, reports
├── backend-agents/     # Motor de agentes: LangGraph + RAG + LLM
├── frontend/           # Next.js 16 — dashboard admin + zona cliente
└── docker-compose.prod.yml
```

---

## Setup Local

### 1. Prerrequisitos

- Python 3.11+
- Docker + Docker Compose
- Node.js 20+

### 2. Variables de Entorno

Cada backend tiene su propio `.env`. **Nunca committear credenciales.**

```bash
# Copiar plantillas
cp backend-saas/.env.example backend-saas/.env
cp backend-agents/.env.example backend-agents/.env
# Editar con tus valores locales
```

La variable `DATABASE_URL` es **obligatoria** — el servicio no arranca sin ella (fail-fast).

### 3. Base de Datos local

```bash
docker compose -f docker-compose.local.yml up -d
# Levanta solo PostgreSQL en 127.0.0.1:5432

cd frontend && npx prisma migrate dev   # aplica el schema
```

### 4. Correr los backends

```bash
# Terminal 1
cd backend-saas
pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload

# Terminal 2
cd backend-agents
pip install -r requirements.txt
uvicorn app.main:app --port 8001 --reload
```

Documentación interactiva disponible en:
- `http://localhost:8000/docs` — Backend SaaS (Swagger)
- `http://localhost:8001/docs` — Backend Agents (Swagger)

---

## Convenciones de Código

### Python

- **No hardcodear credenciales** — siempre `os.environ.get("VAR")` con fail-fast si es crítica
- **No exponer internals de DB en HTTP** — usar mensajes genéricos en `HTTPException`, loguear el error real con `logger.error()`
- **Connection pooling** — usar `db_conn()` del pool en `app/db/pool.py`, no abrir conexiones directas con `psycopg2.connect()`
- Type hints en funciones nuevas
- Docstrings en funciones públicas

### Ejemplo correcto

```python
from app.db.pool import db_conn

def get_tenant(tenant_id: str) -> dict:
    """Fetch tenant by id. Returns None if not found."""
    with db_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, nombre FROM tenants WHERE id = %s", (tenant_id,))
        row = cur.fetchone()
    return {"id": row[0], "nombre": row[1]} if row else None
```

### Ejemplo incorrecto (evitar)

```python
import psycopg2, os

def get_tenant(tenant_id):
    conn = psycopg2.connect("postgresql://postgres:MiPassword@...")  # ❌ hardcoded
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM tenants WHERE id = '{tenant_id}'")  # ❌ SQL injection
    ...
except Exception as e:
    raise HTTPException(detail=str(e))  # ❌ expone internals
```

---

## Agregar un Nuevo Endpoint

### Backend SaaS

1. Crear router en `backend-saas/app/<nombre>_router.py`
2. Registrar en `backend-saas/app/main.py`:
   ```python
   from app.<nombre>_router import router as <nombre>_router
   app.include_router(<nombre>_router)
   ```
3. Usar `Depends(get_current_user)` para autenticación
4. Usar `Depends(require_analista_or_admin)` para endpoints de gestión

### Backend Agents

1. Los endpoints nuevos de agente van en `backend-agents/app/main.py` directamente (app chico)
2. O como router separado e incluido igual que en SaaS

---

## Tests

```bash
# Backend Agents
cd backend-agents
python -m pytest app/tests/ -v

# Backend SaaS (si existen tests)
cd backend-saas
python -m pytest -v
```

Los tests de DB requieren `DATABASE_URL` o `POSTGRES_PRISMA_URL` seteados en el entorno.

---

## Docker Build

```bash
# Build sin cache (cuando se cambian dependencias)
docker compose -f docker-compose.prod.yml build --no-cache backend-saas backend-agents

# Recrear containers
docker compose -f docker-compose.prod.yml up -d --force-recreate backend-saas backend-agents

# Verificar rutas registradas (sin reiniciar)
docker exec <container-saas> python -c \
  "from app.auth_router import router; print([r.path for r in router.routes])"
```

---

## Documentación relacionada

| Doc | Contenido |
|---|---|
| [Infraestructura.md](Infraestructura.md) | Docker Compose, servicios, puertos, env vars |
| [tracing/README_TRACING_SYSTEM.md](tracing/README_TRACING_SYSTEM.md) | Trazabilidad de agentes, `session_id`, `finish_reason` |
| [Security/secret-rotation.md](Security/secret-rotation.md) | Rotación de credenciales |
| [dbs/roles-definition.md](dbs/roles-definition.md) | RBAC, roles, permisos |
