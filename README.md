# ⚡ Revenue OS — Agencia Leads Management System

![Revenue OS Banner](https://img.shields.io/badge/Status-Live%20MVP-emerald?style=for-the-badge&logo=rocket)
![Stack](https://img.shields.io/badge/Stack-Next.js%2016%20%7C%20Tailwind%204%20%7C%20Prisma%20%7C%20Supabase-blue?style=for-the-badge)

**Revenue OS** es un ecosistema operativo diseñado para agencias B2B y startups que buscan transformar la gestión técnica en impacto financiero real. Basado en la arquitectura de **8 Unidades de Negocio**, permite una visión ejecutiva 360° del rendimiento de equipo y seguridad.

---

## 🏛️ Arquitectura: Las 8 Unidades de Negocio

El sistema está organizado por objetivos de negocio, no solo por herramientas:

1.  **Executive**: Forecast, Margen y KPIs de Alto Nivel.
2.  **Comercial**: Gestión de Pipeline e Ingresos.
3.  **Clientes**: CRM y Satisfacción (CSAT).
4.  **Marketing**: Campañas, Leads y Atribución.
5.  **Operaciones**: (ACTIVO) Gestión de Equipo y Performance Center.
6.  **Data**: Estado de ETLs y Modelado de Datos.
7.  **Seguridad**: (ACTIVO) Centro IAM (Identity & Access Management).
8.  **Settings**: Configuración de Tenant y Suscripción.

---

## 🚀 Módulos Clave Implementados

### 📈 Operational Performance Center

Ubicado en `Operaciones -> Gestión de Equipo`.

- **Ranking de Impacto**: Clasificación de colaboradores por Revenue generado y cumplimiento de objetivos.
- **Live Activity Feed**: Registro en tiempo real de actividades críticas (llamadas, deals, deploys) consumidas desde **Supabase**.
- **Métricas de Impacto**: Cálculo dinámico de Workload y contribución al margen por usuario.

### 🛡️ IAM Security Center (Identity & Access Management)

Ubicado en `Seguridad -> Centros IAM`.

- **Invitaciones Autónomas**: Generación de links de seguridad únicos con validez de 7 días.
- **Email Onboarding**: Integración con **Resend** para envío automatizado de credenciales prioritarias.
- **Herencia de Roles**: Los nuevos miembros heredan permisos granulares (Sales, Developer, Manager) definidos por el admin.
- **Acceptance Gateway**: Landing page dedicada para validación de identidad y configuración de contraseña.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Estilos**: [Tailwind CSS 4](https://tailwindcss.com/) (Premium Dark Aesthetic)
- **ORM**: [Prisma 6](https://www.prisma.io/)
- **Base de Datos**: [Supabase (PostgreSQL)](https://supabase.com/)
- **Emails**: [Resend](https://resend.com/)
- **Iconografía**: [Lucide React](https://lucide.dev/)

---

## 📦 Estructura de Documentación (FCM Standard)

El proyecto sigue una metodología de documentación profesional ubicada en `/docs`:

- [**PRD (Product Requirement)**](./docs/product/2026-02-22_revenue-os-prd.md): Visión de negocio y casos de uso.
- [**Design Doc**](./docs/design/2026-02-22_revenue-os-design.md): User Journey, Arquitectura Funcional y UI.
- [**Tech Stack Doc**](./docs/design/2026-02-22_revenue-os-techstack.md): Justificación técnica y modelos de datos.
- [**Tasks (FCM Standard)**](./docs/tasks/2026-02-22_revenue-os-implementation.md): Registro histórico de implementación técnica.

---

## ⚙️ Configuración del Entorno (.env)

Para habilitar todas las funcionalidades, asegúrate de configurar:

```bash
# DB Sync
POSTGRES_PRISMA_URL="postgresql://...:6543/..." # Pooling (App)
POSTGRES_URL_NON_POOLING="postgresql://...:5432/..." # Direct (Migrations)

# Email Service
RESEND_API_KEY="re_..."

# App URL (Para links de invitación)
NEXT_PUBLIC_APP_URL="http://localhost:3001"
```

---

## 🛠️ Comandos Útiles

```bash
# Sincronizar esquema con Supabase
npx prisma db push

# Regenerar cliente Prisma
npx prisma generate

# Inyectar datos reales de simulación de impacto
node scripts/seed-revenue-os.mjs

# Levantar entorno de desarrollo
npm run dev
```

---

_Desarrollado para Agencia Leads — Transformando Datos en Revenue._
