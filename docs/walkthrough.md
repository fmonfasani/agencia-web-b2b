# Walkthrough técnico — Webshooks
> Última actualización: 2026-04-10

---

## Fase 1 — Aislamiento Multi-Tenant y Auth

**Estado:** ✅ Completo

- **Scoped Prisma**: cliente de base de datos que inyecta automáticamente el `tenantId` en cada consulta
- **Middleware de seguridad**: validación en cada petición — el usuario solo puede acceder al tenant al que pertenece
- **RBAC**: roles `SUPER_ADMIN | ADMIN | ANALISTA | CLIENTE | MEMBER | VIEWER` sincronizados entre Next-Auth y la DB
- **`POST /auth/register-company`**: registro de empresa en 1 paso — crea Usuario + Tenant + Membership en una transacción
- **API Keys** (`wh_xxxxx`): generadas en login, usadas en header `X-API-Key` para todos los endpoints del backend

---

## Fase 2 — Dashboard y Módulo Operativo

**Estado:** ✅ Completo

### Frontend `/admin/`
- **Dashboard ejecutivo**: 4 KPI cards (clientes activos, agentes, queries hoy, health) + Recharts LineChart + BarChart Top Clientes + tabla actividades recientes
- **SystemHealth**: badge verde/rojo por servicio (PostgreSQL, Qdrant, Ollama, Redis) conectado a `GET /health`

### Frontend `/app/` (zona cliente)
- **Layout** con sidebar (Home, Agentes, Marketplace, Observabilidad, Facturación) + topbar sticky con `NotificationBell`
- **NotificationBell**: campana con badge de conteo, polling cada 30s, dropdown con últimas 5 notificaciones
- **Dashboard cliente**: KPIs propios + LineChart queries/30d + estado onboarding
- **Chat con Agente IA**: burbujas de conversación, Server Action `executeAgent()`, hook `useAgentChat()`
- **Mis Agentes**: grid de cards con status badge + métricas por agente
- **Marketplace**: grid de agentes disponibles con filtros por categoría/precio/rating
- **Onboarding Wizard** (`useReducer`, 4 pasos): Empresa → Industria → Docs → Test agente
- **Reports**: `AreaChart` (queries/día) + `BarChart` (errores/día) + KPI cards + export CSV/PDF/HTML

### Backend SaaS
- Training module completo: upload → chunking → embedding → Qdrant
- Módulo de notificaciones (`notifications_router.py`)
- Reports con streaming download CSV

---

## Fase 3 — Motor de Agentes IA

**Estado:** ✅ Completo

### LangGraph Engine
```
rag_node → planner_node ⇄ tool_executor_node
              ↓
           should_continue()
              ↓
       END (is_finished=True)
```

- **`rag_node`**: busca en Qdrant la colección del tenant, retorna top-5 chunks con timing
- **`planner_node`**: deterministic finish check → LLM call → `AgentDecision.from_dict()` → update state
- **`tool_executor_node`**: ejecuta `search` o `scrape` según decisión; bloquea scrape sin URL
- **`should_finish()`**: termina sin LLM si max_iterations, loop detectado, o resultado accionable encontrado

### LLM Providers
- **Ollama** (local): `gemma3:latest` por defecto
- **OpenRouter** (cloud): rotation automática entre múltiples keys configuradas, fallback si excede límite diario

### Session Persistence (`session_service.py`)
- Tabla `agent_sessions` (PostgreSQL): `session_id | tenant_id | user_id | messages | created_at | updated_at`
- `GET /agent/execute` con `conversation_id` → carga historial previo y lo inyecta en `initial_state.messages`
- Sin `conversation_id` → crea sesión nueva y retorna `session_id` en la respuesta
- Historial limitado a últimos 40 mensajes para evitar context overflow

### Seguridad del agente
- `validate_tenant_access()`: cliente solo puede ejecutar contra su propio tenant; analistas/admins pueden cross-tenant
- Rate limit: 10 req/min por IP en `/agent/execute`
- Prompt injection guard: detecta "ignore previous instructions", "system override", "bypass safety"

---

## Fase 4 — Remediación de Seguridad

**Estado:** ✅ Completo (commit `a55556b`)

### Vulnerabilidades resueltas
| # | Tipo | Archivos afectados | Fix |
|---|------|-------------------|-----|
| 1–9 | Credencial hardcodeada en código fuente | 9 archivos `.py` | Removido, fail-fast si `DATABASE_URL` no está en env |
| 10 | Sin connection pooling | `auth_service.py`, `tenant_router.py`, etc. | `psycopg2.pool.ThreadedConnectionPool` en `db/pool.py` |
| 11 | Sin API key rotation | — | `POST /auth/rotate-key` con invalidación inmediata |
| 12 | SQL internals expuestos en HTTP | `main.py`, `tenant_router.py` | Mensajes genéricos, log real en server |
| 13 | Sin fail-fast para env vars críticas | todos los servicios | `RuntimeError` al startup si faltan |

### Verificación
```bash
# Confirmar cero credenciales en código fuente Python
grep -r "Karaoke" backend-agents backend-saas --include="*.py"
# → 0 matches

# Test API key rotation
curl -X POST http://localhost:8000/auth/rotate-key -H "X-API-Key: wh_xxx"
# → nueva key; la anterior retorna 401
```

---

## Infraestructura Docker (docker-compose.prod.yml)

6 servicios orquestados:

| Servicio | Imagen | Puerto público | Healthcheck |
|---|---|---|---|
| `postgres` | postgres:16-alpine | ninguno (interno) | `pg_isready` |
| `qdrant` | qdrant/qdrant | 6333, 6334 | — |
| `redis` | redis:7-alpine | ninguno (interno) | `redis-cli ping` |
| `ollama` | ollama/ollama | ninguno (interno) | — |
| `backend-saas` | build local | **8000** | `curl /health` |
| `backend-agents` | build local | **8001** (interno) | `curl /health` |

Todos en red bridge `app-network`.

---

## Próximos pasos

Ver `docs/task.md` — sección "En Progreso / Pendiente".
