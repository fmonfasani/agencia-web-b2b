# Estado Actual del Proyecto — Agencia Web B2B
**Última actualización:** 2026-04-18  
**Rama:** main  
**Versión:** 3.0 (Warm Neutral Design + Colapsable Sidebar)

---

## 📋 Resumen Ejecutivo

**Webshooks** es una plataforma SaaS multi-tenant que permite a empresas gestionar agentes IA, entrenamientos de modelos, marketplace de soluciones, observabilidad y reportes. Arquitectura completa con backend FastAPI + frontend Next.js, motor de agentes LangGraph, soporte multi-LLM (Ollama + OpenRouter), y diseño visual implementado.

### Estado General
- ✅ **Autenticación y Multi-Tenant:** Completo (RBAC, API Keys, session persistence)
- ✅ **Motor de Agentes:** Completo (LangGraph, RAG, herramientas de búsqueda/scrape)
- ✅ **Dashboard y módulos operativos:** Completo (clientes + admin)
- ✅ **Infraestructura:** Producción en DigitalOcean (Docker Compose, PostgreSQL, Qdrant, Redis, Ollama)
- ✅ **Remediación de seguridad:** Completo (13 vulnerabilidades resueltas)
- ✅ **Diseño Visual (Warm Neutral):** Completo (paleta #F1EFEA, sidebar colapsable, accent #F59E0B)
- 🟡 **Documentación:** En proceso de actualización

---

## 🏗️ Arquitectura

### Stack Tecnológico

| Capa | Tecnología | Versión | Estado |
|------|-----------|---------|--------|
| **Frontend** | Next.js 16 + Turbopack | 16.x | ✅ Producción (Vercel) |
| **Autenticación** | NextAuth v5 | 5.x | ✅ Configurado |
| **Estilos** | Tailwind CSS v4 | 4.x | ✅ Con diseño warm neutral |
| **ORM (Frontend)** | Prisma | 5.x | ✅ Activo |
| **Backend SaaS** | FastAPI | 0.104+ | ✅ Producción |
| **Motor Agentes** | FastAPI + LangGraph | 0.1+ | ✅ Producción |
| **Base de Datos** | PostgreSQL 16 | 16 | ✅ Containerizado |
| **Vector DB** | Qdrant | latest | ✅ Containerizado |
| **Cache/Queue** | Redis 7 | 7 | ✅ Containerizado |
| **LLM Local** | Ollama | latest | ✅ Containerizado (gemma3) |
| **Orchestración** | Docker Compose | - | ✅ Producción + Local |
| **Cloud** | DigitalOcean | - | ✅ Droplet NYC3 (Ubuntu 24.04 LTS) |

### Estructura de Directorios

```
agencia-web-b2b/
├── frontend/                      # Next.js app (port 3001)
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css        # Design tokens (warm neutral palette)
│   │   │   ├── [locale]/
│   │   │   │   ├── app/           # Client zone
│   │   │   │   │   ├── layout.tsx # Server component (auth + session)
│   │   │   │   │   ├── page.tsx   # Dashboard cliente
│   │   │   │   │   ├── agents/    # Mis Agentes
│   │   │   │   │   ├── chat/      # Chat IA
│   │   │   │   │   ├── training/  # Entrenamiento
│   │   │   │   │   ├── marketplace/
│   │   │   │   │   ├── observability/
│   │   │   │   │   ├── billing/
│   │   │   │   │   ├── reports/
│   │   │   │   │   └── settings/
│   │   │   │   └── admin/         # Admin zone
│   │   │   │       ├── layout.tsx # Admin sidebar (warm neutral)
│   │   │   │       └── dashboard/ # Admin dashboard
│   │   ├── components/
│   │   │   ├── layouts/
│   │   │   │   └── ClientLayoutContent.tsx  # NEW: Client layout con sidebar colapsable
│   │   │   ├── dashboard/
│   │   │   │   ├── KPICard.tsx           # Updated: nuevos colores accent
│   │   │   │   ├── AgentCard.tsx
│   │   │   │   └── SystemHealth.tsx
│   │   │   ├── ui/
│   │   │   │   ├── status-badge.tsx      # Updated: warm neutral colors
│   │   │   │   ├── data-table.tsx        # Updated: warm neutral colors
│   │   │   │   ├── button.tsx            # Updated: black primary + amber accent
│   │   │   │   └── badge.tsx             # Updated: warm palette
│   │   │   ├── notifications/
│   │   │   │   └── NotificationBell.tsx  # Componente de campana
│   │   │   ├── WebshooksLogo.tsx         # Logo en sidebar
│   │   │   └── providers/
│   │   │       └── AuthSessionProvider.tsx
│   │   └── lib/
│   │       ├── auth.ts                   # NextAuth config
│   │       ├── api-client.ts
│   │       └── hooks/
│   ├── prisma/
│   │   ├── schema.prisma                 # ORM definitions
│   │   └── migrations/
│   └── package.json
│
├── backend-saas/                  # FastAPI SaaS API (port 8000)
│   ├── app/
│   │   ├── main.py                # Entry point + healthchecks
│   │   ├── routers/
│   │   │   ├── auth_router.py      # Register, login, rotate-key
│   │   │   ├── tenant_router.py    # Gestión de tenants
│   │   │   ├── training_router.py  # Upload, chunking, embedding
│   │   │   ├── notifications_router.py
│   │   │   └── reports_router.py
│   │   ├── services/
│   │   │   ├── auth_service.py
│   │   │   ├── tenant_service.py
│   │   │   ├── training_service.py
│   │   │   ├── qdrant_service.py   # Vector search
│   │   │   └── notification_service.py
│   │   ├── db/
│   │   │   ├── pool.py             # Connection pooling (ThreadedConnectionPool)
│   │   │   ├── models.py           # SQLAlchemy ORM
│   │   │   └── queries.py          # Raw SQL helpers
│   │   ├── models/
│   │   │   └── schemas.py          # Pydantic schemas
│   │   └── middleware/
│   │       ├── cors.py
│   │       └── security.py         # Tenant validation, API key check
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env (gitignored)
│
├── backend-agents/                # FastAPI Motor de Agentes (port 8001)
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/
│   │   │   └── agent_router.py     # POST /agent/execute
│   │   ├── services/
│   │   │   ├── agent_service.py    # LangGraph engine
│   │   │   ├── session_service.py  # Persistence
│   │   │   ├── llm_service.py      # Ollama + OpenRouter
│   │   │   ├── tool_service.py     # Search + Scrape
│   │   │   └── qdrant_service.py   # RAG
│   │   ├── models/
│   │   │   └── agent_models.py
│   │   └── middleware/
│   │       └── security.py
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env (gitignored)
│
├── docker-compose.prod.yml        # Orquestación producción
├── docker-compose.local.yml       # Orquestación desarrollo (solo PostgreSQL)
│
└── docs/
    ├── PROJECT_STATUS.md           # Este archivo
    ├── Infraestructura.md          # Configuración Docker + variables
    ├── walkthrough.md              # Walkthrough técnico fases 1-4
    ├── ENVIRONMENTS.md             # Variables de entorno
    ├── E2E_TEST.md                 # Testing end-to-end
    ├── task.md                     # Tareas pendientes
    └── Security/
        └── secret-rotation.md      # Rotación de credenciales
```

---

## 🎨 Diseño Visual — Warm Neutral (v3)

### Cambio Reciente: 2026-04-18

El diseño ha sido completamente rediseñado con paleta "warm neutral" tipo Notion/Linear, reemplazando la anterior paleta negra/naranja saturada.

**Archivos modificados:**

| Archivo | Cambios |
|---------|---------|
| `frontend/src/app/globals.css` | Reescrito `@theme` con tokens warm neutral |
| `frontend/src/app/[locale]/app/layout.tsx` | Server component que pasa session a ClientLayoutContent |
| `frontend/src/components/layouts/ClientLayoutContent.tsx` | **NUEVO**: Client component con sidebar colapsable |
| `frontend/src/app/[locale]/admin/layout.tsx` | Sidebar warm neutral, colapsable |
| `frontend/src/components/dashboard/KPICard.tsx` | Colores accent actualizados |
| `frontend/src/components/ui/status-badge.tsx` | Badges semánticos con colores warm |
| `frontend/src/components/ui/data-table.tsx` | Tablas con paleta warm neutral |
| `frontend/src/components/ui/button.tsx` | Negro primario + ámbar accent |
| `frontend/src/components/ui/badge.tsx` | Badges con colores warm |

### Paleta de Colores

| Token | Valor | Uso |
|-------|-------|-----|
| **bg-main** | #F1EFEA | Background principal (cálido, no azulado) |
| **bg-card** | #FFFFFF | Cards, tablas, contenedores |
| **bg-sidebar** | #EDEBE6 | Sidebar claro (clapsable) |
| **bg-sidebar-hover** | #E2E0DA | Hover items sidebar |
| **bg-sidebar-active** | #D9D7D1 | Item activo sidebar |
| **border** | #E5E3DF | Separadores, bordes |
| **text-primary** | #1C1C1C | Texto principal (muy oscuro) |
| **text-secondary** | #6F6F6F | Texto secundario |
| **text-muted** | #9A9A9A | Labels, muted text |
| **accent** | #F59E0B | Accent principal (ámbar cálido) |
| **accent-hover** | #D97706 | Hover accent |
| **accent-light** | #FFF4E5 | Background suave con accent |
| **green** | #1F7A63 | Positivo (scores, gains) |
| **green-light** | #E6F4EE | Background badge verde |
| **blue** | #3B82F6 | "Nuevo" status |
| **blue-light** | #EAF2FF | Background badge azul |
| **purple** | #8B5CF6 | "Contactado" status |
| **purple-light** | #F3EEFF | Background badge lila |
| **btn-primary** | #111111 | Botones primarios |

### Comportamiento del Sidebar

El sidebar es **colapsable y responsivo**:

```tsx
// Estado
const [isCollapsed, setIsCollapsed] = useState(false);  // Manual toggle
const [isHovered, setIsHovered] = useState(false);      // Hover expand
const isExpanded = !isCollapsed || isHovered;           // Lógica de expansión

// Tamaño
// Colapsado: w-16 (solo iconos)
// Expandido: w-60 (iconos + labels)

// Comportamiento
// 1. Usuario hace click en toggle → setIsCollapsed(true/false)
// 2. Si colapsado y mouse entra → setIsHovered(true) → expande temporalmente
// 3. Si mouse sale → setIsHovered(false) → se contrae de nuevo
// 4. Botón ChevronLeft/Right indica estado
```

---

## 🔐 Autenticación y Multi-Tenant

### NextAuth v5 Configuration

**Archivo:** `frontend/src/lib/auth.ts`

- **Provider:** Credentials (usuario + contraseña)
- **Backend:** `POST /auth/login` en backend-saas
- **Session:** JWT almacenado en cookie `authjs.session-token`
- **RBAC:** Roles persistidos en session (`ADMIN`, `SUPER_ADMIN`, `ANALISTA`, `CLIENTE`, `MEMBER`, `VIEWER`)

### Flujo de Login

```
1. Usuario ingresa email + contraseña en /auth/sign-in
2. NextAuth → POST /auth/login (backend-saas)
3. Backend retorna: { user: {...}, api_key: "wh_xxxxx" }
4. Session guardada localmente (NextAuth)
5. Cada request al backend incluye header X-API-Key: wh_xxxxx
6. Si no autenticado → redirect a /auth/sign-in
```

### Acceso a Session en Componentes

**Server Component (layout.tsx):**
```tsx
const session = await auth();  // NextAuth
if (!session?.user) redirect(`/${locale}/auth/sign-in`);
```

**Client Component (ClientLayoutContent.tsx):**
```tsx
// Recibe session como prop del server parent
interface ClientLayoutContentProps {
  session: Session | null;
}

// Acceso seguro a roles
const userRole = (session?.user?.role as string) ?? "";
```

---

## 🤖 Motor de Agentes IA

### Arquitectura LangGraph

```
Input: { query, tenant_id, conversation_id? }
  ↓
[RAG Node] → Busca en Qdrant la colección del tenant
  ↓
[Planner Node] → LLM decide: finish / search / scrape
  ↓
[Tool Executor Node] → Ejecuta tool seleccionado
  ↓
[Should Continue?] → Loop si no finish_reason
  ↓
Output: { answer, tools_used, iterations, timing }
```

### Endpoints

**`POST /agent/execute`** (backend-agents:8001)
```json
{
  "query": "¿Cuál es la cobertura en Madrid?",
  "tenant_id": "tenant_123",
  "conversation_id": "sess_456"  // opcional
}
```

**Respuesta:**
```json
{
  "session_id": "sess_456",
  "answer": "...",
  "tools_used": ["search", "scrape"],
  "iterations": 3,
  "total_ms": 2500,
  "finish_reason": "max_iterations"
}
```

### LLM Providers

**Ollama (Local, default):**
- Modelo: `gemma3:latest`
- Sin costo, privado, sin latencia de red

**OpenRouter (Cloud, fallback):**
- Rotation automática entre múltiples API keys
- Fallback si Ollama no disponible o excede límite
- Modelo: `openai/gpt-3.5-turbo`
- Soporte para múltiples modelos configurable

### Session Persistence

Tabla: `agent_sessions`
```sql
session_id TEXT PRIMARY KEY
tenant_id TEXT NOT NULL
user_id TEXT NOT NULL
messages JSONB  -- Array de {role: "user"|"assistant", content: "..."}
created_at TIMESTAMP
updated_at TIMESTAMP
```

Límite: últimos 40 mensajes para evitar context overflow.

---

## 📊 Módulos del Frontend

### 1. **Dashboard (Cliente)** `/app/`

**Componentes principales:**
- **KPICard**: Tarjetas con métrica + trend (color ámbar #F59E0B)
- **LineChart**: Queries en últimos 30 días
- **BarChart**: Top clientes por actividad
- **Tabla actividades**: Últimas 10 con status badges

**Datos:**
```
GET /dashboard/stats?tenant_id=...
→ { active_clients, agents_count, queries_today, health_status }
```

### 2. **Mis Agentes** `/app/agents`

Grid de cards con:
- Nombre, descripción
- Status badge (activo/inactivo)
- Métricas: queries, avg_response_time, accuracy
- Botones: Editar, Eliminar, Ver Detalles

### 3. **Chat IA** `/app/chat`

- Burbujas de conversación (user azul, assistant gris)
- Input con submit button
- Server Action: `executeAgent(query, conversation_id)`
- Hook: `useAgentChat()` para state local

### 4. **Entrenamiento** `/app/training`

- Upload de archivos (docx, pdf, txt)
- Progreso de chunking + embedding
- Tabla de documentos entrenados
- Estadísticas: documentos, chunks, tokens usados

### 5. **Marketplace** `/app/marketplace`

- Grid de agentes disponibles
- Filtros: categoría, precio, rating
- Cards con descripción, precio, botón instalar
- Detalles en modal

### 6. **Observabilidad** `/app/observability`

- Gráficos de performance: latencia, errores/día
- Tabla de traces (request_id, duration, status)
- Filtros por date range, status

### 7. **Facturación** `/app/billing`

- Plan actual, límites de uso
- Historial de invoices
- Opción upgrade/downgrade
- Payment methods

### 8. **Reportes** `/app/reports`

- AreaChart: queries/día
- BarChart: errores/día
- KPI cards: totales
- Export: CSV, PDF, HTML

### 9. **Configuración** `/app/settings`

#### General
- Nombre empresa, logo, timezone

#### Team `/app/settings/team`
- Miembros con roles
- Invitar nuevo miembro
- Revocar acceso

#### Webhooks `/app/settings/webhooks`
- Crear webhook (select eventos)
- Tabla de webhooks (endpoint, status, eventos)
- Test manual, ver logs

#### Activity Log `/app/settings/activity`
- Tabla de eventos (usuario, acción, timestamp, details)
- Filtros por tipo, usuario, fecha

---

## 🏢 Dashboard Admin `/admin/`

**Acceso:** Solo ADMIN, SUPER_ADMIN

### Componentes

1. **Dashboard Ejecutivo**
   - KPI cards: clientes activos, agentes totales, queries hoy, health
   - LineChart: queries en últimos 7 días
   - BarChart: top 5 clientes por queries
   - Tabla: últimas 10 actividades globales

2. **System Health**
   - Badge por servicio: PostgreSQL, Qdrant, Ollama, Redis
   - Colores: verde (healthy), rojo (down)
   - API: `GET /health` (backend-saas)

---

## 🐳 Infraestructura Docker

### Producción (DigitalOcean Droplet)

**Archivo:** `docker-compose.prod.yml`

```yaml
services:
  postgres       # PostgreSQL 16, sin puerto externo
  qdrant         # Vector DB, puertos 6333/6334
  redis          # Cache + queue, sin puerto externo
  ollama         # LLM local, sin puerto externo
  backend-saas   # FastAPI, puerto 8000 (público via Cloud Firewall)
  backend-agents # FastAPI, puerto 8001 (interno)
```

**Healthchecks:**
| Servicio | Comando | Intervalo | Retries |
|----------|---------|-----------|---------|
| postgres | `pg_isready -U postgres` | 10s | 5 |
| redis | `redis-cli ping` | 10s | 3 |
| backend-saas | `curl -f http://localhost:8000/health` | 30s | 3 |
| backend-agents | `curl -f http://localhost:8001/health` | 30s | 3 |

**Volúmenes:**
| Volumen | Montaje | Propósito |
|---------|---------|----------|
| `postgres_data` | `/var/lib/postgresql/data` | Datos DB |
| `qdrant_data` | `/qdrant/storage` | Vectores |
| `redis_data` | `/data` | Cache persistente |
| `ollama_data` | `/root/.ollama` | Modelos LLM |
| `./backend-saas/uploads` | `/app/uploads:rw` | Archivos clientes |
| `./backend-agents/logs` | `/app/logs:rw` | Logs |

**Variables de entorno clave:**

`backend-saas/.env`:
```env
DATABASE_URL=postgresql://postgres:password@postgres:5432/agencia_web_b2b_dev
ALLOWED_ORIGINS=http://localhost:3001,https://app.webshooks.io
LOG_LEVEL=INFO
BACKEND_AGENTS_URL=http://backend-agents:8001
```

`backend-agents/.env`:
```env
DATABASE_URL=postgresql://postgres:password@postgres:5432/agencia_web_b2b_dev
OLLAMA_BASE_URL=http://ollama:11434
DEFAULT_MODEL=gemma3:latest
OPENROUTER_API_KEYS=key1,key2,key3  # Rotation automática
OPENROUTER_DEFAULT_MODEL=openai/gpt-3.5-turbo
```

### Desarrollo Local

**Archivo:** `docker-compose.local.yml`

Solo levanta PostgreSQL en puerto 5432:
```bash
docker compose -f docker-compose.local.yml up -d
```

Luego:
```bash
# Backend SaaS
cd backend-saas && uvicorn app.main:app --port 8000 --reload

# Backend Agents
cd backend-agents && uvicorn app.main:app --port 8001 --reload

# Frontend
cd frontend && npm run dev   # puerto 3001
```

---

## 🔒 Seguridad

### Remediación Completada (2026-04-10)

13 vulnerabilidades resueltas:

| # | Tipo | Fix |
|---|------|-----|
| 1-9 | Credencial hardcodeada | Removido, fail-fast si DATABASE_URL no está en env |
| 10 | Sin connection pooling | `ThreadedConnectionPool` en `db/pool.py` |
| 11 | Sin API key rotation | `POST /auth/rotate-key` con invalidación inmediata |
| 12 | SQL internals expuestos | Mensajes genéricos en HTTP, log real en server |
| 13 | Sin fail-fast para env vars | `RuntimeError` al startup si faltan vars críticas |

### API Key Rotation

```bash
curl -X POST http://localhost:8000/auth/rotate-key \
  -H "X-API-Key: wh_xxxxx"
```

**Comportamiento:**
- Nueva key generada
- Key anterior retorna 401 inmediatamente
- Sin período de grace

### Firewall Cloud (DigitalOcean)

| Puerto | Protocolo | Origen | Propósito |
|--------|-----------|--------|----------|
| 22 | TCP | Tus IPs | SSH |
| 8000 | TCP | 0.0.0.0/0 | Backend SaaS (API Gateway) |
| 6333 | TCP | IPs específicas | Qdrant HTTP (si necesario) |
| 80/443 | TCP | 0.0.0.0/0 | HTTPS (Nginx/Caddy) |

**Servicios NO expuestos:**
- PostgreSQL (5432) — solo internal
- Redis (6379) — solo internal
- Ollama (11434) — solo internal
- Backend-Agents (8001) — solo internal

---

## 🧪 Testing

### E2E Tests

Ver `E2E_TEST.md` para:
- Setup de fixtures (usuarios test, tenants, agentes)
- Flows: login → crear agent → execute → verificar sesión
- Teardown automático

Ejecución:
```bash
cd frontend && npm run test:e2e
```

### Unit Tests (Backend)

```bash
# Backend SaaS
cd backend-saas && pytest tests/ -v

# Backend Agents
cd backend-agents && pytest tests/ -v
```

---

## 📝 Documentación de API

### Backend SaaS `/docs`

**Swagger UI:** `http://localhost:8000/docs`

Endpoints principales:
- `POST /auth/login`
- `POST /auth/register-company`
- `POST /auth/rotate-key`
- `GET /tenant/{tenant_id}`
- `POST /training/upload`
- `GET /reports/{tenant_id}`
- `GET /health`

### Backend Agents `/docs`

**Swagger UI:** `http://localhost:8001/docs`

Endpoints principales:
- `POST /agent/execute`
- `GET /agent/sessions/{session_id}`
- `GET /health`

---

## 🚀 Deployment

### Preparación (Pre-flight Checklist)

Antes de desplegar a producción:

```bash
# 1. Verifica environment variables
grep -r "password\|secret\|key" backend-saas backend-agents --include="*.py"  # 0 matches

# 2. Verifica Docker images
docker image ls | grep agencia

# 3. Verifica health endpoints
curl http://localhost:8000/health
curl http://localhost:8001/health

# 4. Verifica DB migrations
cd frontend && npx prisma migrate status

# 5. Verifica tests
npm run test:e2e
```

### Deploy en DigitalOcean

```bash
# 1. SSH a droplet
ssh root@your-droplet-ip

# 2. Pull latest code
cd /path/to/agencia-web-b2b
git pull origin main

# 3. Build y deploy
docker compose -f docker-compose.prod.yml build --no-cache backend-saas backend-agents
docker compose -f docker-compose.prod.yml up -d --force-recreate

# 4. Verifica
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --follow backend-saas
```

**Rollback (si es necesario):**
```bash
git revert <commit-hash>
docker compose -f docker-compose.prod.yml build --no-cache backend-saas backend-agents
docker compose -f docker-compose.prod.yml up -d --force-recreate
```

---

## 📋 Variables de Entorno Críticas

### Backend SaaS

| Variable | Tipo | Obligatorio | Descripción |
|----------|------|-------------|-------------|
| `DATABASE_URL` | string | ✅ | PostgreSQL connection string |
| `POSTGRES_PASSWORD` | string | ✅ | Contraseña de postgres |
| `POSTGRES_HOST` | string | ✅ | Host PostgreSQL (docker: `postgres`) |
| `ALLOWED_ORIGINS` | string | ✅ | CORS origins (coma-separado) |
| `LOG_LEVEL` | string | — | INFO, DEBUG, WARNING (default: INFO) |
| `BACKEND_AGENTS_URL` | string | ✅ | URL del motor de agentes |

### Backend Agents

| Variable | Tipo | Obligatorio | Descripción |
|----------|------|-------------|-------------|
| `DATABASE_URL` | string | ✅ | PostgreSQL connection string |
| `OLLAMA_BASE_URL` | string | ✅ | URL local Ollama |
| `DEFAULT_MODEL` | string | ✅ | Modelo por defecto (ej: gemma3:latest) |
| `OPENROUTER_API_KEYS` | string | — | Múltiples keys (coma-separado) |
| `OPENROUTER_DEFAULT_MODEL` | string | — | Model fallback (ej: openai/gpt-3.5-turbo) |
| `ALLOW_FALLBACK_TENANT` | bool | — | Permitir cross-tenant access (default: false) |

### Frontend

| Variable | Tipo | Obligatorio | Descripción |
|----------|------|-------------|-------------|
| `NEXT_PUBLIC_SAAS_API_URL` | string | ✅ | Backend SaaS URL (ej: http://localhost:8000) |
| `NEXTAUTH_SECRET` | string | ✅ | Secret para JWT (generar con `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | string | ✅ | URL del app (ej: http://localhost:3001) |

---

## 🎯 Próximos Pasos (Roadmap)

Ver `docs/task.md` para el detalle. Resumen:

- [ ] **Analytics avanzado:** Integración con Mixpanel / Segment
- [ ] **Custom webhooks:** Soporte para eventos personalizados
- [ ] **Multi-agent orchestration:** Coordinación entre múltiples agentes
- [ ] **Fine-tuning workflow:** Capacidad de fine-tunear modelos locales
- [ ] **White-label:** Customización de UI por tenant

---

## 📞 Contacto y Soporte

- **Propietario:** Federico Monfasani (fmonfasani@gmail.com)
- **Repositorio:** https://github.com/fmonfasani/agencia-web-b2b
- **Documentación:** `docs/`

---

**Versión:** 3.0  
**Última actualización:** 2026-04-18  
**Rama activa:** main  
**Commits pendientes:** 6 (adelante de origin/main)
