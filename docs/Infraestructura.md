# Infraestructura Webshooks

**Documento Técnico de Configuración v2.0**
Docker Compose · PostgreSQL 16 · Qdrant · Redis · Ollama · FastAPI

> Última actualización: 2026-04-10

---

## 1. Arquitectura General

| Capa | Tecnología | Notas |
|---|---|---|
| Cloud Provider | DigitalOcean (NYC3) | Droplet Ubuntu 24.04 LTS |
| Orquestación | Docker Compose | `docker-compose.prod.yml` |
| Base de datos | PostgreSQL 16 | Containerizado, sin puerto externo |
| Vector DB | Qdrant latest | Puertos 6333 (HTTP) y 6334 (gRPC) |
| Cache / Queue | Redis 7 | Interno, auth via `requirepass` |
| LLM local | Ollama latest | Modelo por defecto: `gemma3:latest` |
| Backend SaaS | FastAPI Python | Puerto 8000 |
| Backend Agents | FastAPI + LangGraph | Puerto 8001 |
| Frontend | Next.js 16 (Vercel) | Fuera del compose |
| Firewall | DigitalOcean Cloud Firewall | Port-level protection |

---

## 2. Docker Compose (Producción)

Archivo: `docker-compose.prod.yml`

### 2.1 Servicios

```
postgres      ← Base de datos principal (sin puerto externo)
qdrant        ← Vector store (6333/6334)
redis         ← Cache y cola (interno)
ollama        ← LLM local (interno 11434)
backend-saas  ← API Gateway SaaS (8000)
backend-agents← Motor de agentes LangGraph (8001 interno)
```

Red: `app-network` (bridge). Solo `backend-saas` expone puerto al host.

### 2.2 Healthchecks

| Servicio | Comando | Intervalo | Retries |
|---|---|---|---|
| postgres | `pg_isready -U postgres` | 10s | 5 |
| redis | `redis-cli ping` | 10s | 3 |
| backend-saas | `curl -f http://localhost:8000/health` | 30s | 3 |
| backend-agents | `curl -f http://localhost:8001/health` | 30s | 3 |

### 2.3 Dependencias

```
backend-saas  → postgres (healthy), qdrant, redis (healthy)
backend-agents → postgres (healthy), qdrant, ollama, redis (healthy)
```

### 2.4 Volúmenes

| Volumen | Montaje | Propósito |
|---|---|---|
| `postgres_data` | `/var/lib/postgresql/data` | Datos PostgreSQL |
| `qdrant_data` | `/qdrant/storage` | Vectores Qdrant |
| `redis_data` | `/data` | Persistencia Redis |
| `ollama_data` | `/root/.ollama` | Modelos LLM descargados |
| `./backend-saas/uploads` | `/app/uploads:rw` | Archivos subidos por clientes |
| `./backend-agents/logs` | `/app/logs:rw` | Logs del motor de agentes |

---

## 3. Comandos de Operación

### Levantar todo
```bash
docker compose -f docker-compose.prod.yml up -d
```

### Rebuild con cambios de código
```bash
docker compose -f docker-compose.prod.yml build --no-cache backend-saas backend-agents
docker compose -f docker-compose.prod.yml up -d --force-recreate backend-saas backend-agents
```

### Ver estado y health
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs backend-saas --tail 50
docker compose -f docker-compose.prod.yml logs backend-agents --tail 50
```

### Mantenimiento de PostgreSQL
```bash
# Conectar al container
docker exec -it <container-postgres> psql -U postgres -d agencia_web_b2b_dev

# Ver conexiones activas
SELECT count(*) FROM pg_stat_activity;
```

---

## 4. Variables de Entorno

> **NUNCA** committear credenciales en el código. Usar archivos `.env` (gitignored).

### backend-saas/.env
```env
POSTGRES_PASSWORD=<strong_password>
POSTGRES_USER=postgres
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=agencia_web_b2b_dev
DATABASE_URL=postgresql://postgres:<password>@postgres:5432/agencia_web_b2b_dev
ALLOWED_ORIGINS=http://localhost:3001,http://127.0.0.1:3001
LOG_LEVEL=INFO
BACKEND_AGENTS_URL=http://backend-agents:8001
```

### backend-agents/.env
```env
DATABASE_URL=postgresql://postgres:<password>@postgres:5432/agencia_web_b2b_dev
ALLOWED_ORIGINS=http://localhost:3001
OLLAMA_BASE_URL=http://ollama:11434
DEFAULT_MODEL=gemma3:latest
ALLOW_FALLBACK_TENANT=false
LOG_LEVEL=INFO
OPENROUTER_API_KEYS=<comma-separated-keys>
OPENROUTER_DEFAULT_MODEL=openai/gpt-3.5-turbo
```

---

## 5. Seguridad: Firewall Cloud

DigitalOcean Cloud Firewall protege el Droplet a nivel de puerto.

### Reglas Inbound

| Puerto | Protocolo | Origen | Propósito |
|---|---|---|---|
| 22 | TCP | Tus IPs | SSH admin |
| 8000 | TCP | 0.0.0.0/0 | Backend SaaS (API Gateway) |
| 6333 | TCP | IPs específicas | Qdrant HTTP (solo si necesario) |
| 80/443 | TCP | 0.0.0.0/0 | HTTPS (Nginx o Caddy frente al compose) |

> PostgreSQL (5432), Redis (6379), Ollama (11434), y Backend-Agents (8001) **no deben estar expuestos** al exterior — solo accesibles dentro de la red Docker.

### Recomendaciones
- Usar SSL/TLS en producción (`sslmode=require` en DATABASE_URL)
- Rotar las API keys cada 90 días (`POST /auth/rotate-key`)
- Revisar `docs/Security/secret-rotation.md` ante cualquier exposición

---

## 6. Base de Datos

### Schema
Manejado por **Prisma** (en el frontend): `frontend/prisma/schema.prisma`

Para aplicar cambios de schema:
```bash
cd frontend
npx prisma migrate deploy   # producción
npx prisma migrate dev      # desarrollo local
```

### Tablas clave del motor de agentes (raw SQL — sin Prisma)
```sql
-- Trazas de ejecución
agent_request_traces (trace_id, tenant_id, query, iterations, total_ms, finish_reason, ...)

-- Historial de sesiones de conversación
agent_sessions (session_id, tenant_id, user_id, messages::jsonb, created_at, updated_at)

-- Config por tenant (multi-agente)
tenants (id, nombre, descripcion, config::jsonb)
tenant_servicios (tenant_id, nombre, categoria, descripcion)
tenant_sedes (tenant_id, nombre, direccion, telefonos, horario_semana, ...)
tenant_coberturas (tenant_id, nombre, activa, sedes_disponibles)
```

---

## 7. Desarrollo Local

Archivo: `docker-compose.local.yml` — solo levanta PostgreSQL:

```bash
docker compose -f docker-compose.local.yml up -d
```

Puerto expuesto: `127.0.0.1:5432`

Los backends Python se corren directamente:
```bash
# Backend SaaS
cd backend-saas && uvicorn app.main:app --port 8000 --reload

# Backend Agents
cd backend-agents && uvicorn app.main:app --port 8001 --reload
```

Frontend:
```bash
cd frontend && npm run dev   # puerto 3001
```

---

**Versión:** 2.0
**Última actualización:** 2026-04-10
