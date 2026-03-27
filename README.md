# ⚡ Webshooks — Agencia Leads Management System

![Webshooks Banner](https://img.shields.io/badge/Status-Live%20MVP-emerald?style=for-the-badge&logo=rocket)
![Stack](https://img.shields.io/badge/Stack-Next.js%2016%20%7C%20Tailwind%204%20%7C%20Prisma%20%7C%20Supabase-blue?style=for-the-badge)


**Webshooks** es un ecosistema operativo diseñado para agencias B2B y startups que buscan transformar la gestión técnica en impacto financiero real. Basado en la arquitectura de **8 Unidades de Negocio**, permite una visión ejecutiva 360° del rendimiento de equipo y seguridad.

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

- [**PRD (Product Requirement)**](./docs/product/2026-02-22_webshooks-prd.md): Visión de negocio y casos de uso.
- [**Design Doc**](./docs/design/2026-02-22_webshooks-design.md): User Journey, Arquitectura Funcional y UI.
- [**Tech Stack Doc**](./docs/design/2026-02-22_webshooks-techstack.md): Justificación técnica y modelos de datos.
- [**Tasks (FCM Standard)**](./docs/tasks/2026-02-22_webshooks-implementation.md): Registro histórico de implementación técnica.

---

## ⚙️ Configuración del Entorno (.env)

Para habilitar todas las funcionalidades, usa `.env.example` como base y configurá secretos reales fuera del repo.

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

## 🔐 Security

- Nunca se deben commitear secrets en el repositorio.
- Revisá y ejecutá la rotación en [`docs/security/secret-rotation.md`](./docs/security/secret-rotation.md).

---

## 🛠️ Comandos Útiles

```bash
# Sincronizar esquema con Supabase
npx prisma db push

# Regenerar cliente Prisma
npx prisma generate

# Inyectar datos reales de simulación de impacto
node scripts/seed-webshooks.mjs

# Levantar entorno de desarrollo
npm run dev
```

---

## 🛡️ Troubleshooting PRs

Si no podés crear Pull Requests, normalmente es porque tu repo local no tiene configurado el remote `origin`.

Podés revisar y corregir eso automáticamente con:

```bash
npm run git:fix-pr
```

Si tu entorno no expone la variable `GITHUB_REPOSITORY`, pasá manualmente la URL del repo:

```bash
bash scripts/fix-pr-setup.sh git@github.com:<owner>/<repo>.git
```

---

## 🖥️ VPS — Comandos Esenciales

> **Servidor:** `<REPLACE_WITH_ACTUAL_VALUE>` | **Usuario:** `<REPLACE_WITH_ACTUAL_VALUE>`

### 🔌 Conexión SSH
```bash
ssh <REPLACE_WITH_ACTUAL_VALUE>@<REPLACE_WITH_ACTUAL_VALUE>
```

---

### 🐳 Docker / Agent Service

```bash
# Ver estado de los contenedores
cd /opt/agencia-web-b2b/agent-service && docker compose ps

# Ver logs en tiempo real
docker compose logs -f

# Reiniciar servicio (ej: después de cambiar .env)
docker compose up -d --force-recreate

# Ver variables de entorno activas
docker compose exec agent-service env | grep -E "SECRET|URL|TOKEN"
```

---

### 🗄️ Base de Datos (PostgreSQL)

```bash
# Conectarse a la DB
docker exec -it multidb-postgres psql -U postgres -d agencia_web_b2b

# Contar leads totales
docker exec -it multidb-postgres psql -U postgres -d agencia_web_b2b -c \
  'SELECT COUNT(*) FROM "Lead";'

# Ver últimos leads scrapeados
docker exec -it multidb-postgres psql -U postgres -d agencia_web_b2b -c \
  'SELECT name, phone, description, "createdAt" FROM "Lead" ORDER BY "createdAt" DESC LIMIT 10;'

# Leads por fuente
docker exec -it multidb-postgres psql -U postgres -d agencia_web_b2b -c \
  'SELECT "sourceType", COUNT(*) FROM "Lead" GROUP BY "sourceType";'
```

---

### 🤖 Scraping Manual (desde VPS)

```bash
# Lanzar scraping puntual
curl -X POST http://localhost:8000/scraper/run \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: <REPLACE_WITH_ACTUAL_VALUE>" \
  -d '{"query":"personal trainer","location":"Buenos Aires, Argentina","max_leads":25,"tenant_id":"<REPLACE_WITH_ACTUAL_VALUE>","language":"es"}'

# Verificar estado de un job
curl http://localhost:8000/scraper/status/<JOB_ID> \
  -H "x-admin-secret: <REPLACE_WITH_ACTUAL_VALUE>"

# Test endpoint de health
curl http://localhost:8000/health
```

---

### ⏰ Cron Job — Scraping Automático cada 20 minutos

```bash
# Crear script de scraping
cat > /opt/scrape-personal-trainer.sh << 'EOF'
#!/bin/bash
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo "[$TIMESTAMP] Iniciando scraping..."
curl -s -X POST http://localhost:8000/scraper/run \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: <REPLACE_WITH_ACTUAL_VALUE>" \
  -d '{"query":"personal trainer","location":"Buenos Aires, Argentina","max_leads":25,"tenant_id":"<REPLACE_WITH_ACTUAL_VALUE>","language":"es"}'
echo ""
EOF
chmod +x /opt/scrape-personal-trainer.sh

# Registrar el cron (cada 20 minutos)
(crontab -l 2>/dev/null; echo "*/20 * * * * /opt/scrape-personal-trainer.sh >> /var/log/scraper.log 2>&1") | crontab -

# Ver crons activos
crontab -l

# Ver logs del scraper
tail -f /var/log/scraper.log

# Detener el cron
crontab -r
```

---

### 📥 Importar Leads desde archivos JSON (local)

```bash
# Un archivo o carpeta completa — skippea duplicados automáticamente
npx tsx scripts/import-leads.ts "scraping download"

# Desde Apify API (requiere token)
APIFY_API_TOKEN=<REPLACE_WITH_ACTUAL_VALUE> npx tsx scripts/import-leads.ts
```

---

_Desarrollado para Agencia Leads — Transformando Datos en Revenue._

