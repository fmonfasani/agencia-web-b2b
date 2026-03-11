# Revenue OS — Repository Analysis

## 🌟 Overview

**Revenue OS** is a specialized operational ecosystem for B2B Agencies. It transforms technical management into financial impact by organizing the agency into 8 distinct Business Units.

## 🏗️ Architecture & Tech Stack

- **Frontend**: Next.js 16 (App Router) with React 19, hosted on **Vercel**.
- **Agent Service**: Python (FastAPI) backend for heavy lifting (scraping, AI), hosted on a **VPS**.
- **Database**: PostgreSQL hosted on **DigitalOcean VPS**, managed via **Prisma ORM**.
- **Authentication**: NextAuth.js (v5) + Custom login logic.
- **Communication**: Resend (Email), Nodemailer, and WhatsApp integration.
- **Monitoring**: Sentry, Vercel Analytics, and OpenTelemetry for deep observability.

## 🏛️ The 8 Business Units

1. **Executive**: High-level KPIs and margins.
2. **Comercial**: Pipeline and revenue management.
3. **Clientes**: CRM and CSAT.
4. **Marketing**: Campaigns and lead attribution.
5. **Operaciones**: (Active) Team performance ranking and impact metrics.
6. **Data**: ETL status and data modeling.
7. **Seguridad**: (Active) IAM Security Center, invitations, and role management.
8. **Settings**: Tenant and subscription configuration.

## 🚀 Key Functional Modules

### 1. Lead Intelligence & Management (`src/lib/leads`, `src/app/api/leads`)

- **Ingestion**: Multi-source lead ingestion (Manual, API, Scrapers).
- **AI Scoring**: Intelligent lead scoring based on business criteria using OpenAI.
- **Lead Repository**: Centralized storage and management of business opportunities.

### 2. Operational Performance Center (`src/app/[locale]/operations`)

- **Impact Ranking**: Gamified ranking of team members based on generated revenue.
- **Real-time Activity**: Live feed of critical business events.
- **Workload Analysis**: Monitoring team capacity and individual contribution.

### 3. Proposal Engine (`src/lib/proposals`, `src/app/api/proposals`)

- **Generation**: Creating professional business proposals.
- **PDF Export**: Generating PDF versions of proposals using `@react-pdf/renderer`.
- **Engagement Tracking**: (Inferred) Monitoring when proposals are sent and viewed.

### 4. IAM Security Center (`src/app/[locale]/security`)

- **Onboarding Automático**: Links de invitación seguros y entrega automatizada de credenciales.
- **Herencia de Roles**: Sistema de permisos granular para diferentes roles de la agencia.

### 5. Outreach & Comunicación (`src/lib/outreach`, `src/lib/whatsapp`)

- **Multicanal**: Flujos de comunicación integrados de Email y WhatsApp.
- **Automatización**: Seguimientos y notificaciones automatizadas.

## 🛠️ Infraestructura Interna & SRE

- **Observabilidad**: Especializado en `src/lib/observability` para trazas, logs y métricas de negocio.
- **Servicio Bridge**: `src/lib/bridge-client.ts` actúa como interfaz entre el frontend de Next.js y el servicio de agentes en Python.
- **Multi-tenancy**: Arquitectado para white-labeling y soporte de múltiples agencias (`src/lib/tenant-context.ts`).
