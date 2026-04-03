# Auditoría Técnica: agencia-web-b2b
**Fecha:** 2026-02-28 | **Auditor:** Antigravity AI Senior Architect  
**Branch:** `main` | **Status:** Sistema Vivo (Producción)

---

## 1. Resumen Ejecutivo

`agencia-web-b2b` es un **SaaS B2B multi-tenant** que combina:
- **Landing page pública** con chat de ventas IA integrado
- **CRM interno** (Webshooks) con gestión de leads, deals y equipo
- **Plataforma de agentes IA** configurables por tenant (OpenAI Assistants)
- **Sistema de onboarding** con invitaciones por email y RBAC granular

El sistema se auto-describe como "Webshooks — Sistema Operativo de Ingresos para Agencias". Está pensado para que agencias digitales usen la plataforma para gestionar sus propios clientes B2B.

> **Estado general:** Arquitectura sólida con muchas features marcadas como `isLocked` en el sidebar (features planeadas pero no implementadas). El núcleo (auth, leads, agents, metrics) está funcional.

---

## 2. Stack Tecnológico

| Categoría | Tecnología | Versión | Clasificación |
|---|---|---|---|
| Framework | Next.js | ^16.1.6 | Core |
| Runtime UI | React | ^19.2.4 | Core |
| ORM | Prisma | ^6.19.2 | Infraestructura |
| Base de datos | PostgreSQL (Neon/Vercel) | - | Infraestructura |
| Autenticación | NextAuth v5 (beta) | ^5.0.0-beta.30 | Seguridad |
| OAuth Google | @auth/prisma-adapter | ^2.11.1 | Seguridad |
| Rate limiting | @upstash/ratelimit | ^2.0.8 | Seguridad |
| Cache/KV | @upstash/redis | ^1.36.1 | Infraestructura |
| IA Chat | openai (Assistants API) | ^6.25.0 | Core |
| Email transaccional | resend | ^6.9.2 | Infraestructura |
| Email fallback | nodemailer | ^7.0.13 | Infraestructura |
| i18n | next-intl | ^4.8.0 | Core |
| Animaciones | framer-motion | ^12.29.0 | UI |
| Iconos | lucide-react | ^0.563.0 | UI |
| CSS | Tailwind CSS | ^4 | UI |
| Utilidades CSS | clsx + tailwind-merge | - | UI |
| Testing unitario | Jest | ^30.2.0 | Testing |
| Testing E2E | Playwright | ^1.58.0 | Testing |
| Testing React | @testing-library/react | ^16.3.2 | Testing |
| Performance CI | Lighthouse CI | @lhci/cli ^0.15.1 | Observabilidad |
| HTTP client | axios | ^1.13.5 | Infraestructura |
| Build | Next.js (SWC) | - | Build |
| Linting | ESLint 9 | ^9 | DevOps |
| Formatting | Prettier | ^3.8.1 | DevOps |
| Git hooks | Husky + lint-staged | ^9.1.7 | DevOps |

---

## 3. Arquitectura Detallada

### 3.1 Patrón Arquitectónico: Feature-Based Layered Architecture

No es MVC puro ni Clean Architecture formal, es una arquitectura **por capas con Feature-Scoping** propia de Next.js App Router:

```
┌─────────────────────────────────────────────────────────┐
│  PRESENTACIÓN         src/app/[locale]/                 │
│  Landing + Admin UI   src/components/                   │
├─────────────────────────────────────────────────────────┤
│  API LAYER            src/app/api/                      │
│  Route Handlers       (Next.js Route Handlers)          │
├─────────────────────────────────────────────────────────┤
│  SERVICE / DOMAIN     src/lib/                          │
│  auth, authz,         plan-guard, lead-repository,      │
│  tenant-context       mail, security/audit              │
├─────────────────────────────────────────────────────────┤
│  INFRAESTRUCTURA      src/lib/prisma.ts                 │
│  DB + Cache           Prisma ORM + Upstash Redis        │
├─────────────────────────────────────────────────────────┤
│  DATOS                prisma/schema.prisma (530 LOC)    │
│  PostgreSQL           20 modelos, multi-tenant          │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Flujo Request → Response

```
HTTP Request
  │
  ├─ Middleware (src/middleware.ts)
  │   ├─ Si /api/** → bypass (NextResponse.next())
  │   └─ Si página → next-intl middleware (detecta locale)
  │
  ├─ Route Handler (src/app/api/*/route.ts)
  │   ├─ getSessionUser() → NextAuth session
  │   ├─ prisma.membership.findFirst() → resuelve tenantId
  │   ├─ assertPlanLimit() → verifica cuota del plan
  │   ├─ Lógica de negocio + prisma.*
  │   └─ prisma.businessEvent.create() → event log
  │
  └─ Server Component (src/app/[locale]/admin/*/page.tsx)
      ├─ requireAuth() → redirige si no autenticado
      └─ prisma.* directo (Server Components pueden acceder a DB)
```

### 3.3 Multi-Tenancy: Resolución del TenantId

El `tenantId` se resuelve en este orden de precedencia:

1. Header HTTP `x-tenant-id` (para llamadas server-to-server)
2. Sesión de NextAuth (`session.tenantId` — seteado en callback)
3. Membership activa del usuario en DB

**Archivo clave:** `src/lib/tenant-context.ts` — función `requireTenantId()` que lanza `TenantContextError` si falta.

### 3.4 Separación Frontend/Backend

| Zona | Ubicación | Tipo |
|---|---|---|
| Landing pública | `src/app/[locale]/page.tsx` + `src/components/*.tsx` | Server + Client Components |
| Admin Panel (Webshooks) | `src/app/[locale]/admin/` | Server Components |
| API interna | `src/app/api/` | Route Handlers (edge-compatible) |
| API pública scraper | `src/app/[locale]/api/` | Route Handlers |
| Lógica de negocio | `src/lib/` | TypeScript puro (server-side) |

---

## 4. Mapa de Módulos

```
src/
├── middleware.ts          → i18n routing bypass para /api y /auth
├── app/
│   ├── [locale]/          → RUTAS PÚBLICAS Y ADMIN (con locale es/en)
│   │   ├── page.tsx       → Home/Landing
│   │   ├── layout.tsx     → Layout global + GTM + i18n
│   │   ├── auth/          → sign-in, sign-up, reset-password
│   │   ├── admin/         → Webshooks (protegido por requireAuth)
│   │   │   ├── layout.tsx → Sidebar con 8 units + auth check
│   │   │   ├── dashboard/ → Leads Hub
│   │   │   ├── operations/→ Gestión de Equipo
│   │   │   ├── security/  → IAM (gestión de usuarios/roles)
│   │   │   └── select-tenant/ → Multi-tenant switcher
│   │   ├── pricing/       → Planes de suscripción
│   │   ├── privacy/       → Política de privacidad
│   │   └── accept-invitation/ → Flujo de aceptación de invitaciones
│   ├── admin/             → Admin interno (acceso by credentials, NOT locale-wrapped)
│   │   └── intelligence/  → Panel de inteligencia interna
│   └── api/               → API Routes
│       ├── auth/[...nextauth]/ → NextAuth handler
│       ├── agents/        → CRUD de agentes IA
│       ├── chat/sales/    → Chat IA con OpenAI Assistants
│       ├── invitations/accept/ → Aceptar invitaciones
│       └── metrics/       → KPIs del Webshooks
├── components/
│   ├── *.tsx              → Componentes Landing (Hero, Header, Footer, etc.)
│   ├── admin/             → Sidebar, LogoutButton, SidebarNavItem
│   ├── auth/              → Formularios sign-in/sign-up
│   ├── invitations/       → UI de invitaciones
│   └── pricing/           → Pricing cards
├── lib/
│   ├── auth.ts            → Config NextAuth (providers, callbacks, helpers)
│   ├── authz.ts           → RBAC (roles, requireRole, requireRoleForRequest)
│   ├── plan-guard.ts      → assertPlanLimit(), getPlanLimits()
│   ├── tenant-context.ts  → requireTenantId(), getActiveTenantId()
│   ├── lead-repository.ts → Repository Pattern para Lead (CRUD con tenant scope)
│   ├── prisma.ts          → Singleton PrismaClient
│   ├── ratelimit.ts       → Upstash rate limiter (sliding window 10/min)
│   ├── mail.ts            → Nodemailer + Resend para emails transaccionales
│   ├── analytics.ts       → Google Analytics helpers
│   ├── security/
│   │   ├── audit.ts       → logAuditEvent() — 8 tipos de eventos
│   │   ├── cookies.ts     → Helpers para cookies seguras
│   │   └── rate-limit.ts  → Rate limit general (distinto al de ratelimit.ts)
│   ├── bot/               → Lógica del bot de WhatsApp/chat
│   ├── iam/               → Identity & Access Management helpers
│   ├── leads/             → Lógica adicional de leads (scoring, clasificación)
│   └── meta/              → SEO metadata helpers
├── i18n/
│   ├── routing.ts         → Configuración de locales (es, en)
│   └── request.ts         → next-intl server request config
├── types/                 → TypeScript types/interfaces globales
└── messages/              → Archivos i18n JSON (es.json, en.json)
```

---

## 5. Mapa de APIs

### 5.1 API Routes (src/app/api/)

| Endpoint | Método | Auth | Body / Params | Respuesta | Archivo |
|---|---|---|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | - | OAuth callbacks | Redirect / Session | `src/app/api/auth/[...nextauth]/route.ts` |
| `/api/agents` | GET | Session | - | `{ agents[] }` | `src/app/api/agents/route.ts` |
| `/api/agents` | POST | Session + PlanLimit | `{ name, type, channel, promptConfig, knowledgeBase, assistantId }` | `{ agent }` 201 | `src/app/api/agents/route.ts` |
| `/api/chat/sales` | POST | Opcional (rate limit IP) | `{ message, threadId? }` | `{ response, threadId }` | `src/app/api/chat/sales/route.ts` |
| `/api/invitations/accept` | POST | - | `{ token }` | Redirect | `src/app/api/invitations/accept/route.ts` |
| `/api/metrics` | GET | Session | - | KPIs del tenant (MRR, leads, deals, etc.) | `src/app/api/metrics/route.ts` |

### 5.2 Contrato GET /api/metrics

```typescript
// Respuesta exitosa 200
{
  activeLeads: number,        // leads no convertidos/perdidos
  totalDeals: number,         // deals del mes actual
  closedWonDeals: number,     // deals ganados del mes
  conversionRate: number,     // porcentaje (0-100)
  mrrFromDeals: number,       // suma de valores de deals cerrados
  totalMrr: number,           // MRR acumulado de customers
  agentCount: number,         // agentes IA activos
  userCount: number,          // usuarios activos en tenant
  customerCount: number,      // clientes convertidos
  dealsByHuman: number,       // deals asignados a humanos
  dealsByAgent: number,       // deals asignados a agentes IA
  avgDaysToClose: number,     // días promedio para cerrar
  recentEvents: [             // últimos 10 business events
    { type, createdAt, source }
  ]
}
```

### 5.3 Contrato POST /api/chat/sales

```typescript
// Request
{ message: string, threadId?: string }

// Response 200
{ response: string, threadId: string }

// Response 429 (rate limit)
{ error: string }
// Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
```

---

## 6. Modelo de Datos (Prisma — PostgreSQL)

### 6.1 Entidades y Relaciones

```
User ─────┬─── Membership ───── Tenant ─┬─── Subscription ──── Plan
          │         │                   ├─── Agent
          ├─── Account (OAuth)          ├─── Product
          ├─── Session                  ├─── Service
          ├─── PasswordResetToken       ├─── Pipeline ──── Deal
          ├─── Invitation               ├─── Customer
          ├─── AuditEvent               ├─── Lead (tenantId FK)
          ├─── Activity                 ├─── BusinessEvent (event log)
          ├─── Task ──── Project        └─── InvitationAudit
          ├─── UserDailyMetrics
          └─── Deal (assignedToUser)
```

### 6.2 Modelos Críticos

| Modelo | Propósito | Campos clave |
|---|---|---|
| `Tenant` | Organización/cliente del SaaS | `slug`, `status`, `onboardingDone` |
| `Membership` | Join User↔Tenant con rol | `role` (SUPER_ADMIN/ADMIN/OPERATOR/MEMBER/VIEWER), `department` |
| `Lead` | Prospecto CRM | `tenantId`, `sourceType` (SCRAPER/MANUAL/API/ADS), `potentialScore`, `status` |
| `Deal` | Oportunidad de venta | `stage` (DealStage enum), `assignedToUserId` OR `assignedToAgentId` |
| `Agent` | Agente IA del tenant | `assistantId` (OpenAI), `promptConfig`, `channel` (WHATSAPP/WEB/EMAIL) |
| `BusinessEvent` | Event log de dominio | `type`, `payload` JSON, `source` — es el Event Bus |
| `Plan` | Plan de suscripción | `code` (BASIC/PRO/ENTERPRISE), `limits` JSON (`maxUsers`, `maxAgents`, etc.) |
| `AuditEvent` | Log de seguridad | `eventType`, `userId`, `tenantId`, `ipAddress`, `metadata` |

### 6.3 Índices Relevantes

- `Lead`: índice compuesto `[tenantId, sourceType, status]` — crítico para filtros del CRM
- `AuditEvent`: índices en `eventType`, `createdAt`, `tenantId`
- `BusinessEvent`: índices en `tenantId`, `type`, `createdAt`
- `Invitation`: índice compuesto `[email, tenantId]`, `status`, `expiresAt`

---

## 7. Flujo Funcional Explicado

### 7.1 Flujo de Login con Google OAuth

```
1. Usuario → /es/auth/sign-in
2. Click "Continuar con Google"
3. OAuth redirect → Google → callback /api/auth/callback/google
4. NextAuth v5 (auth.ts L.45-53):
   - allowDangerousEmailAccountLinking: true (merge si email existe)
   - PrismaAdapter crea/actualiza User + Account en DB
5. Session callback (auth.ts L.77-85):
   - Agrega user.id, user.tenantId, user.role a la sesión
6. Redirect → /es/admin/dashboard
```

> **Riesgo:** `allowDangerousEmailAccountLinking: true` permite merge automático de cuentas. Si un atacante controla un proveedor OAuth, puede secuestrar cuentas.

### 7.2 Flujo de Chat de Ventas IA

```
1. Visitante → SalesChatWidget en Landing
2. POST /api/chat/sales { message, threadId? }
3. Rate check: Upstash sliding window 10msg/1min por IP
4. Si threadId existe → reusa hilo; si no → openai.beta.threads.create()
5. Si usuario NO logueado → prepend "[CONTEXTO: persuadir registro]" al mensaje
6. openai.beta.threads.messages.create() + runs.createAndPoll()
7. Espera hasta run.status === "completed"
8. Retorna { response, threadId }
9. Widget persiste threadId en estado local (sin localStorage)
```

### 7.3 Flujo de Invitación de Usuario

```
1. Admin → /admin/dashboard → "Invitar usuario"
2. UI genera token + POST /api/admin/invitations (HECHO)
3. Email enviado via Resend con link /accept-invitation?token=hash
4. Nuevo usuario → click link → POST /api/invitations/accept { token }
5. Sistema verifica: tokenHash, expiresAt, status="PENDING"
6. Crea Membership en tenant con rol definido en invitación
7. logAuditEvent("INVITATION_ACCEPTED") 
8. Redirect → sign-in
```

### 7.4 Flujo de Creación de Agente IA

```
1. Admin → /admin/dashboard → "Nuevo Agente"
2. GET /api/agents → lista agentes existentes
3. POST /api/agents { name, type, channel, assistantId }
4. assertPlanLimit(tenantId, "maxAgents", currentCount)
   ↳ DB query a subscription.plan.limits JSON
   ↳ Si excede → 403 PlanLimitError
5. prisma.agent.create()
6. prisma.businessEvent.create() { type: "AGENT_CREATED" }
7. Response 201 { agent }
```

---

## 8. Seguridad

### 8.1 Autenticación

| Proveedor | Configuración | Riesgo |
|---|---|---|
| Google OAuth | `allowDangerousEmailAccountLinking: true` | ⚠️ Account takeover potential |
| Microsoft Entra | `allowDangerousEmailAccountLinking: true` | ⚠️ Igual |
| Credentials (interno) | Email/password plano en env vars | ⚠️ No bcrypt, solo comparación de strings |

### 8.2 Autorización (RBAC)

- **Roles en DB:** `SUPER_ADMIN`, `ADMIN`, `OPERATOR`, `MEMBER`, `VIEWER` (schema Prisma Role enum)
- **Roles en app:** `OWNER`, `ADMIN`, `SALES`, `VIEWER` (authz.ts — discrepancia con DB!) 
- **Mecanismo:** El rol se lee de header `x-user-role` o cookie `user_role` — **esto es vulnerable** si no se valida que el valor provenga del servidor.

### 8.3 Rate Limiting

- **Scope:** Solo endpoint `/api/chat/sales`
- **Config:** Sliding window 10 req/min por IP
- **Backend:** Upstash Redis

### 8.4 Audit Trail

Archivo `src/lib/security/audit.ts` — `logAuditEvent()` registra en tabla `AuditEvent`:
- `LOGIN_SUCCESS`, `LOGIN_FAILED`, `TENANT_SWITCH`, `ADMIN_ACTION`, `PASSWORD_CHANGED`, `INVITATION_SENT`, `INVITATION_ACCEPTED`, `COMPANY_REGISTERED`

### 8.5 Vulnerabilidades Detectadas / OWASP

| Riesgo | Severidad | Descripción | Ubicación |
|---|---|---|---|
| Broken Access Control | 🔴 Alto | El rol se lee de cookie `user_role` sin firma criptográfica — manipulable por cliente | `src/lib/authz.ts L.28-40` |
| Account Takeover | 🟡 Medio | `allowDangerousEmailAccountLinking: true` en Google y Microsoft | `src/lib/auth.ts L.47, 61` |
| Credentials en texto plano | 🟡 Medio | Auth interno compara string sin hash | `src/lib/auth.ts L.30-32` |
| Rate limiting incompleto | 🟡 Medio | Solo `/api/chat/sales` tiene rate limit; otros endpoints no | `src/lib/ratelimit.ts` |
| Missing auth en API pública | 🟢 Bajo | El endpoint de chat no requiere auth (esperado, pero vigilar abusos) | `src/app/api/chat/sales/route.ts` |
| CORS no configurado | 🟢 Bajo | No hay configuración CORS explícita en Next.js | `next.config.ts` |

---

## 9. Testing

### 9.1 Cobertura Real

| Tipo | Framework | Archivos | Cobertura estimada |
|---|---|---|---|
| Unit | Jest + Testing Library | 1 archivo (`lead-multitenancy.test.ts`) | ~5% del codebase |
| E2E | Playwright | `e2e/` (estructura presente) | Desconocida |
| Performance | Lighthouse CI | `lighthouserc.json` | Automático en CI |

### 9.2 Test Existente: `lead-multitenancy.test.ts`

Cubre regresiones críticas de seguridad multitenancy:
- `requireTenantId()` lanza `TenantContextError` sin tenantId
- `listLeadsByTenant()` siempre scopa por tenantId en Prisma
- `createLeadForTenant()` asigna tenantId en creación
- Redis en bot usa namespace `lead:{tenantId}:{phone}` (aislamiento por tenant)

### 9.3 Partes Críticas Sin Cobertura

- ❌ Flujo completo de auth (login, OAuth, session)
- ❌ `/api/agents` (plan limit enforcement)
- ❌ `/api/metrics` (cálculos KPI)
- ❌ `/api/invitations/accept` (token validation)
- ❌ `plan-guard.ts` (assertPlanLimit)
- ❌ `authz.ts` (RBAC requireRole)
- ❌ `security/audit.ts` (logAuditEvent)

---

## 10. DevOps / Infraestructura

### 10.1 CI/CD Pipeline (`.github/workflows/ci.yml`)

Ejecuta en `push` y `pull_request` a `main`:

| Job | Comando | Dependencias |
|---|---|---|
| `lint` | `npm run lint` (ESLint 9) | - |
| `type-check` | `npx tsc --noEmit` | - |
| `test` | `npm test` (Jest) | - |
| `build` | `npm run build` (Next.js + prisma generate) | - |
| `e2e-tests` | Playwright (chromium + firefox + webkit) | - |
| `lighthouse` | `lhci autorun` | Depende de `build` |

Los 5 primeros jobs corren en paralelo. Solo Lighthouse espera al build.

### 10.2 Variables de Entorno Requeridas

```bash
# DB
POSTGRES_PRISMA_URL=           # Con connection pooling (Supabase/Neon)
POSTGRES_URL_NON_POOLING=      # Para migraciones directas

# Auth
AUTH_SECRET=                   # NextAuth secret
AUTH_GOOGLE_ID=                # Google OAuth Client ID
AUTH_GOOGLE_SECRET=            # Google OAuth Client Secret
AUTH_MICROSOFT_ENTRA_ID_ID=    # Microsoft App ID
AUTH_MICROSOFT_ENTRA_ID_SECRET=
AUTH_MICROSOFT_ENTRA_ID_ISSUER=
AUTH_INTERNAL_EMAIL=           # Admin interno
AUTH_INTERNAL_PASSWORD=        # Admin interno
AUTH_INTERNAL_TENANT_ID=
AUTH_INTERNAL_ROLE=

# IA
OPENAI_API_KEY=                # También acepta OPEN_IA_API_KEY (typo histórico)
ASSISTANT_ID=                  # OpenAI Assistant ID para el chat de ventas

# Rate limiting / Cache
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Email
RESEND_API_KEY=                # Resend para emails transaccionales

# Analytics
NEXT_PUBLIC_GTM_ID=            # Google Tag Manager
LHCI_GITHUB_APP_TOKEN=         # Para Lighthouse CI en GitHub Actions
```

### 10.3 Scripts Especiales

```bash
npm run db:seed                  # Ejecuta prisma/seed.mjs (Plan BASIC/PRO/ENTERPRISE + tenant demo)
npm run db:backfill:leads-tenant # scripts/backfill-leads-tenant.mjs — migración de leads legacy sin tenantId
```

### 10.4 Hosting Esperado

- **App:** Vercel (Next.js nativo) — inferido por env vars `POSTGRES_PRISMA_URL` patrón Neon/Vercel
- **DB:** Neon o Supabase (PostgreSQL serverless con pooling)
- **Cache:** Upstash Redis (serverless)
- **Email:** Resend
- **IA:** OpenAI API (Assistants v2)

---

## 11. Observabilidad

### 11.1 Estado Actual

| Mecanismo | Estado | Implementación |
|---|---|---|
| Logs de errores | `console.error()` en catch blocks | Básico, deja a Vercel |
| Audit trail DB | ✅ Implementado | `AuditEvent` table + `logAuditEvent()` |
| Business events | ✅ Implementado | `BusinessEvent` table |
| Métricas de performance | ✅ CI | Lighthouse CI en cada build |
| Analytics web | ✅ Producción | Google Analytics 4 via GTM |
| Rate limit analytics | ✅ | Upstash con `analytics: true` |
| APM / Tracing | ❌ No existe | Sin Sentry, Datadog, etc. |
| Alertas | ❌ No existe | Sin configuración |
| Health check endpoint | ❌ No existe | Sin `/api/health` |

### 11.2 Recomendación

La observabilidad de errores depende 100% de los logs de Vercel. Agregar Sentry es prioritario para capturar excepciones con contexto de usuario y tenant.

---

## 12. Deuda Técnica

### 12.1 Issues Detectadas

| Issue | Severidad | Descripción | Archivo |
|---|---|---|---|
| Typo en env var | 🟡 Medio | `OPEN_IA_API_KEY` (typo) coexiste con `OPENAI_API_KEY` | `api/chat/sales/route.ts L.11` |
| RBAC inconsistente | 🔴 Alto | Roles en schema (`SUPER_ADMIN/ADMIN/OPERATOR/MEMBER/VIEWER`) ≠ roles en authz.ts (`OWNER/ADMIN/SALES/VIEWER`) | `schema.prisma L.369-375` vs `authz.ts L.3` |
| Role from cookie | 🔴 Alto | El rol se lee de cookie sin firma — cualquier cliente puede spoofear su rol | `authz.ts L.28-50` |
| OpenAI instanciada en cada request | 🟡 Medio | `new OpenAI()` dentro del handler en vez de singleton | `api/chat/sales/route.ts L.10` |
| Membership lookup duplicado | 🟡 Medio | Cada API route repite el mismo patrón `membership.findFirst()` sin abstracción | Todos los routes de API |
| Baja cobertura de tests | 🔴 Alto | Solo 1 test file para todo el codebase | `src/lib/__tests__/` |
| Features locked en sidebar | 🟢 Info | 70% del sidebar del admin tiene `isLocked=true` — features planeadas | `admin/layout.tsx` |
| Dos archivos de rate-limit | 🟢 Bajo | `lib/ratelimit.ts` y `lib/security/rate-limit.ts` con responsabilidades similares | Ambos |
| `allowDangerousEmailAccountLinking` | 🟡 Medio | Habilitado en todos los OAuth providers sin salvaguardia adicional | `auth.ts L.47, 61` |
| Sin validación de body con Zod | 🟡 Medio | Los route handlers hacen `req.json()` sin schema validation | Todos los POST handlers |

---

## 13. Guía para Desarrollar Nuevas Features

### 13.1 Principio Fundamental: Tenant-First

**TODA** nueva feature que maneje datos debe:
1. Recibir o derivar `tenantId` como primer paso
2. Filtrar **siempre** por `tenantId` en Prisma
3. Usar `requireTenantId()` de `src/lib/tenant-context.ts` que lanza si falta

```typescript
// ✅ Correcto — patrón establecido
const tenantId = requireTenantId(input.tenantId);
const items = await prisma.myModel.findMany({ where: { tenantId } });

// ❌ Incorrecto
const items = await prisma.myModel.findMany(); // Data leak entre tenants
```

### 13.2 Dónde Implementar Qué

| Tipo de Feature | Dónde crear | Qué NO tocar |
|---|---|---|
| Nueva pantalla admin | `src/app/[locale]/admin/[feature]/page.tsx` | `src/middleware.ts` |
| Nuevo endpoint API | `src/app/api/[feature]/route.ts` | `src/lib/prisma.ts` (singleton) |
| Lógica de negocio | `src/lib/[feature].ts` o `src/lib/[feature]/` | `src/lib/auth.ts` (delicado) |
| Nuevo modelo DB | `prisma/schema.prisma` + migración | Modelos existentes sin planear migración |
| Nuevo email transaccional | `src/lib/mail.ts` | - |
| Nuevo tipo de audit | Agregar a `AuditEventType` en `security/audit.ts` | No crear nuevo sistema de logs |
| i18n (nuevo texto) | `messages/es.json` y `messages/en.json` | - |

### 13.3 Patrón Recomendado para Nuevo Endpoint

```typescript
// src/app/api/[feature]/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { assertPlanLimit } from "@/lib/plan-guard"; // Si tiene límite de plan

export const dynamic = "force-dynamic"; // Siempre para routes con auth

export async function POST(req: Request) {
  try {
    // 1. Auth check
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 2. Resolver tenant (patrón establecido en agents/route.ts)
    const membership = await prisma.membership.findFirst({
      where: { userId: user.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
    if (!membership) return NextResponse.json({ error: "No tenant found" }, { status: 403 });

    const tenantId = membership.tenantId;

    // 3. Validar plan limit (si aplica)
    const currentCount = await prisma.myModel.count({ where: { tenantId } });
    await assertPlanLimit(tenantId, "maxXxx", currentCount);

    // 4. Validar body (TODO: usar Zod cuando se implemente)
    const body = await req.json();
    if (!body.requiredField) {
      return NextResponse.json({ error: "Campo requerido" }, { status: 400 });
    }

    // 5. Operación de negocio
    const result = await prisma.myModel.create({
      data: { tenantId, ...body },
    });

    // 6. Emitir business event
    await prisma.businessEvent.create({
      data: {
        tenantId,
        type: "MY_FEATURE_CREATED",
        payload: { id: result.id },
        source: "api",
      },
    });

    return NextResponse.json({ result }, { status: 201 });

  } catch (error: unknown) {
    if (error instanceof PlanLimitError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const msg = error instanceof Error ? error.message : "Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

### 13.4 Refactors Previos Recomendados (Antes de Nuevas Features)

1. **Urgente: Unificar RBAC** — Alinear `Membership.role` en DB con los roles en `authz.ts`. Decidir un único enum y usarlo en ambos lados.

2. **Urgente: Firmar cookie de rol** — Nunca leer rol desde cookie sin verificar que viene del server. Usar el rol del JWT de NextAuth en su lugar.

3. **Recomendado: Abstraer resolución de membership** — Crear `getTenantFromUser(userId)` como helper en `src/lib/` para no repetir el patrón en cada route.

4. **Recomendado: Agregar Zod** — Validar todos los `req.json()` con schemas antes de ejecutar lógica de negocio.

5. **Recomendado: Agregar Sentry** — Captura de errores en producción con contexto de tenant/usuario.

### 13.5 Features Bloqueadas en UI (Roadmap Implied)

Según el sidebar del admin layout, las siguientes features están en el roadmap (marcadas como `isLocked`):
- **Executive:** Vista Global, Revenue MRR/ARR, Forecast
- **Comercial:** Pipeline Kanban, Oportunidades
- **Clientes:** Cartera Activa, Health Score, Renovaciones
- **Marketing:** Campañas Ads, ROI por Canal, SEO/SEM
- **Operaciones:** Facturación, Contratos, Automatización RPA
- **Data:** ETL Status, Integraciones, Logs de Data
- **Seguridad:** Roles RBAC UI, Auditoría UI
- **Settings:** Configuración general, Suscripción Pro

---

## Apéndice: Convenciones de Nombres

| Convención | Patrón | Ejemplo |
|---|---|---|
| Route handlers | `route.ts` en carpeta con nombre del recurso | `api/agents/route.ts` |
| Lib modules | kebab-case | `lead-repository.ts`, `plan-guard.ts` |
| Components | PascalCase TSX | `SidebarNavItem.tsx` |
| Server Components | `page.tsx`, `layout.tsx` | Next.js conventions |
| Tests | `*.test.ts` en `__tests__/` | `lead-multitenancy.test.ts` |
| Business events | SCREAMING_SNAKE_CASE strings | `"AGENT_CREATED"`, `"LEAD_CREATED"` |
| Prisma models | PascalCase singular | `Lead`, `BusinessEvent` |
| Enum values | SCREAMING_SNAKE_CASE | `DealStage.CLOSED_WON` |

---

*Documento generado por auditoría automatizada. Verificar con código fuente para detalles actualizados.*
*Próxima revisión recomendada: después de implementar las features del roadmap locked.*
