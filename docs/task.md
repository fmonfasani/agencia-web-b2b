# Tasks: Webshooks — Estado del Proyecto
> Última actualización: 2026-04-10

---

## ✅ Completado

### Fase Inicial: Diagnóstico y Propuesta
- [x] Análisis de infraestructura y arquitectura actual
- [x] Conversión del plan de negocio a Markdown
- [x] Documentación técnica de Infraestructura, DB y Roles
- [x] Diseño del Plan Maestro Integral

### Fase 0: Estabilización Crítica (Seguridad y Arquitectura)
- [x] Refactorización de `schema.prisma` (relaciones y enums)
- [x] Implementación de Prisma Client Extensions (aislamiento automático)
- [x] **Eliminar credenciales hardcodeadas** — 9 archivos Python saneados (contraseña de DB removida de todo el código fuente)
- [x] **Connection pooling** — `psycopg2.pool.ThreadedConnectionPool` (min=2, max=20) en `backend-saas/app/db/pool.py` y `backend-agents/app/db/pool.py`
- [x] **API key rotation** — endpoint `POST /auth/rotate-key` con invalidación inmediata de la key anterior
- [x] **Fail-fast para DATABASE_URL** — `RuntimeError` al arrancar si no está seteada (en todos los servicios Python)
- [x] **Error sanitization** — reemplazados todos los `detail=str(e)` por mensajes genéricos (evita exposición de SQL en respuestas HTTP)
- [x] Integración de Sentry para observabilidad crítica (frontend — `@sentry/nextjs`)
- [x] Auditoría de Route Handlers para IDOR

### Fase 1: Base Sólida Multi-Tenant Segura
- [x] Middleware de Tenant Context
- [x] Flujo de Auth con inyección de `tenantId`
- [x] Sistema de validación de membresías y roles (RBAC)
- [x] `POST /auth/register-company` — registro 1-paso (empresa + admin + membresía)

### Fase 2: Módulo Operativo Completo
- [x] **NotificationBell** — campana de notificaciones in-app con polling en tiempo real (layout `/app`)
- [x] **Reports** — `AreaChart` (queries/día) + `BarChart` (errores/día) + KPI cards + export CSV/PDF
- [x] **Onboarding Wizard** — 4 pasos con `useReducer`: Empresa → Industria → Docs → Test agente
- [x] Dashboard ejecutivo admin (KPI cards + Recharts)
- [x] Zona cliente `/app` — layout + dashboard + chat + agentes + marketplace
- [x] Sistema de trazabilidad end-to-end (LangGraph → `agent_request_traces` → frontend)
- [x] Módulo de Entrenamiento (upload docs → chunking → embedding → Qdrant)

### Fase 3: Motor de Agentes IA
- [x] LangGraph engine: `rag_node → planner_node ⇄ tool_executor_node`
- [x] Multi-LLM: Ollama (local) + OpenRouter (cloud) con key rotation por uso
- [x] RAG con Qdrant por tenant (colecciones aisladas)
- [x] Tenant config dinámica (tono, fallback, servicios) desde PostgreSQL
- [x] Trazabilidad completa en `agent_request_traces`
- [x] Rate limiting con slowapi (10/min por IP en execute)
- [x] Tenant access control: `validate_tenant_access()` — clientes solo acceden a su tenant
- [x] **Session persistence** — `agent_sessions` table + `session_service.py`; `conversation_id` propaga historial entre turnos
- [x] **GET /agent/config** — servicios, sedes, coberturas y routing rules por tenant

---

## 🔄 En Progreso / Pendiente

### Alta Prioridad
- [ ] **Agent YAML config** — `agents/<tenant>/agent.yaml` + loader; evitar queries a PostgreSQL en cada request del planner para cargar la config
- [ ] **Fix `/metrics/agent` 500** — columna `finish_reason` tiene valores incorrectos en algunos registros históricos
- [ ] **Eval runner básico** — script con casos de prueba para validar comportamiento del agente por tenant
- [ ] **BFG Repo Cleaner** — limpiar contraseña del historial git (acción manual necesaria, herramienta externa)

### Media Prioridad
- [ ] Integración MercadoPago para Subscription Billing completo (tablas `plans` + `subscriptions` ya existen en schema)
- [ ] Scraper de leads distribuido (Apify) con `scraper_schedules`
- [ ] Human Handoff: cuando la IA detecta "intent de cierre", notifica al SALES_REP para tomar control
- [ ] CI/CD avanzado con GitHub Actions (test stage + deploy automático)

### Baja Prioridad / Backlog
- [ ] Análisis de Unit Economics por Tenant
- [ ] Ajuste de Pricing dinámico
- [ ] Auditoría final de seguridad y cumplimiento (SOC2 prep)
- [ ] Auto-scaling basado en load

---

## 🏗️ Arquitectura Actual

| Componente | Tecnología | Puerto | Estado |
|---|---|---|---|
| Frontend | Next.js 16 + Tailwind + shadcn/ui | 3001 | ✅ Activo |
| Backend SaaS | FastAPI + psycopg2 + Prisma schema | 8000 | ✅ Activo |
| Backend Agents | FastAPI + LangGraph + Qdrant | 8001 | ✅ Activo |
| PostgreSQL | PostgreSQL 16-alpine | 5432 (interno) | ✅ Activo |
| Qdrant | Qdrant latest | 6333/6334 | ✅ Activo |
| Redis | Redis 7-alpine | interno | ✅ Activo |
| Ollama | LLM local (gemma3:latest) | interno | ✅ Activo |
