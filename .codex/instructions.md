# 🧠 Webshooks Project: Codex Instructions (v1.1)

## 🏗️ Architecture & Stack

- **Framework**: Next.js 16 (App Router) with React 19.
- **Database / ORM**: Prisma (Postgres 16 en DigitalOcean).
- **Authentication**: Auth.js v5 (NextAuth) con adaptador de Prisma.
- **Multitenancy**: Todas las operaciones DEBEN estar filtradas por `tenantId`.
- **Modelo Mixto (Híbrido)**: La plataforma permite que Agentes Humanos (`SALES_REP`) y Agentes IA (`Agent`) colaboren en tiempo real.

## 🚀 Patrones Clave para el Desarrollo

1. **Aislamiento Automático**: Se debe usar (o preparar) una extensión de Prisma para filtrar por `tenantId` automáticamente en todas las queries.
2. **Lógica de Handoff**: Los agentes de IA deben ser capaces de detectar hitos de venta o necesidad humana y traspasar el chat a un agente real.
3. **Roles Dinámicos (RBAC)**:
   - `SUPER_ADMIN`: Gestión global de la plataforma.
   - `ADMIN`: Dueño de la agencia cliente.
   - `OPERATOR`: Configuración de Agentes IA y Knowledge Base.
   - `SALES_REP`: Vendedor humano, gestión de CRM Kanban.
   - `VIEWER`: Analista de métricas del Módulo de Revenues.
4. **Módulo de Revenues**: Todas las métricas de ingresos, leads y deals deben actualizarse en tiempo real tras cada interacción (IA o Humana).

## 🛡️ Seguridad y Validación

- **Privacidad de Tenants**: Un usuario de un Tenant A nunca debe poder acceder a recursos de un Tenant B (Validación rigurosa de `tenantId`).
- **Secretos**: Las API Keys de OpenAI y Assistant IDs se manejan exclusivamente en el ServerSide.

## 🧪 Calidad y Pruebas

- **Prisma**: Tras cambios en el esquema, ejecutar `npx prisma db push` y verificar integridad en DigitalOcean.
- **Test de Aislamiento**: Probar siempre las nuevas funciones con al menos dos cuentas de diferentes agencias.

---

_Sigue estas instrucciones para mantener la consistencia arquitectónica en el ecosistema de la Webshooks._
