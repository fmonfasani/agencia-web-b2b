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

## 🛠️ Comandos Útiles (Levantar el Entorno Local)

Para ejecutar la plataforma completa localmente, debes levantar los 3 servicios en terminales separadas. Asegúrate de tener también **Ollama** (`ollama serve` y `ollama run gemma3`) corriendo de fondo si vas a ejecutar consultas de IA, así como una instancia de PostgreSQL y Qdrant:

### 1️⃣ Frontend (Next.js)
```bash
# Sincronizar esquema DB Prisma (opcional primera vez)
npx prisma db push
npx prisma generate

# Desde la raíz del repositorio
npm run dev
# 🌐 Estará disponible en http://localhost:3001
```

### 2️⃣ Backend SaaS (Autenticación y Onboarding)
Procesa la ingesta de documentos a la Base de Conocimiento y Auth.
```bash
cd backend-saas

# Activar entorno virtual
# En Windows: venv\Scripts\activate
# En Mac/Linux: source venv/bin/activate

# Instalar dependencias 
pip install -r requirements.txt

# Levantar servidor
uvicorn app.main:app --port 8000 --reload
# 📚 Docs Swagger: http://localhost:8000/docs
```

### 3️⃣ Backend Agents (Motor LangGraph y Qdrant)
Controla el Agente LLM (Planner), búsqueda RAG vectorial con Qdrant y observabilidad (Traces).
```bash
cd backend-agents

# Activar entorno virtual
# En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Levantar servidor
uvicorn app.main:app --port 8001 --reload
# 📚 Docs Swagger: http://localhost:8001/docs
```

---

## 🧠 Arquitectura de Inteligencia Artificial
La arquitectura se apoya fuertemente en dos flujos, delegados cada uno a su respectivo backend:

### 1. Flujo de Onboarding (Knowledge Base)
`Frontend -> POST /onboarding/ingest -> backend-saas:8000`
1. Procesa documentos (PDFs, URLs) del tenant.
2. Genera *chunks* vectoriales (vía Ollama Embeddings).
3. Upsert a la base de datos vectorial de Qdrant.

### 2. Flujo de Query RAG (LangGraph)
`Frontend -> POST /agent/execute -> backend-agents:8001`
Basado en un grafo determinístico:
1. **RAG Node**: Utiliza Ollama Embeddings para vectorizar la duda + `search_qdrant()`.
2. **Planner Node**: Construye el prompt con contexto recabado y herramientas enviándolos al modelo (`llm_call`). Evalúa si ya puede responder o requiere iterar.
3. Las peticiones validan tokens vía `X-API-Key` con PostgreSQL y dejan un `trace_id` de logs estructurados persistido por LangSmith/Base de datos.

### 3. Testing E2E y Autenticación Unificada (NUEVO)
Ambos backends (`backend-saas` y `backend-agents`) ahora **comparten la validación de API Keys directamente desde PostgreSQL** en un formato unificado sincronizado contra la misma base de datos manejada por Prisma. Los mocks estáticos en Agents fueron removidos para asegurar consistencia en roles (`cliente`, `admin`, `superadmin`).

Para testear todo el flujo End-to-End, existe la base test unitaria que comprueba Health, Auth, Creación de Tenants, Ingesta en la Base Local y Testing del LLM en vivo:
```bash
cd backend-saas
python test_e2e_30.py
```

---

## 🚀 Cómo LEVANTAR el proyecto LOCALMENTE

Para utilizar el sistema completo de onboarding y testing de IA, necesitas correr los tres servicios simultáneamente en terminales separadas.

1. **Frontend (Next.js - Puerto 3001)**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Backend SaaS (FastAPI - Puerto 8000)**
   ```bash
   cd backend-saas
   uvicorn app.main:app --port 8000 --reload
   ```

3. **Backend Agents (FastAPI - Puerto 8001)**
   ```bash
   cd backend-agents
   uvicorn app.main:app --port 8001 --reload
   ```
*(Asegurate de correr `ollama launch claude` u `ollama serve gemma3` u otro LLM de manera nativa para resolver las ingestas en `backend-agents`).*

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

---

GUÍA CLARA - QUÉ ARCHIVO VA A DÓNDE
====================================

Te voy a decir EXACTAMENTE dónde copiar cada archivo.

---

ARCHIVO 1
=========
📥 Descargá: backend-saas-main-FINAL.py
📍 Copiar a: D:\...\agencia-web-b2b\backend-saas\app\main.py
❓ Qué es: FastAPI app principal de backend-saas
📋 Contiene: /health, /auth/*, /onboarding/tenant, /onboarding/upload, /onboarding/status, /tenant/me
🔧 Comando:
copy backend-saas-main-FINAL.py "D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\backend-saas\app\main.py"

---

ARCHIVO 2
=========
📥 Descargá: backend-saas-onboarding_router-FINAL.py
📍 Copiar a: D:\...\agencia-web-b2b\backend-saas\app\onboarding_router.py
❓ Qué es: Router FastAPI para onboarding (sin /ingest)
📋 Contiene: POST /onboarding/tenant, POST /onboarding/upload, GET /onboarding/status, DELETE /onboarding/tenant
🔧 Comando:
copy backend-saas-onboarding_router-FINAL.py "D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\backend-saas\app\onboarding_router.py"

---

ARCHIVO 3
=========
📥 Descargá: backend-agents-main-FINAL.py
📍 Copiar a: D:\...\agencia-web-b2b\backend-agents\app\main.py
❓ Qué es: FastAPI app principal de backend-agents
📋 Contiene: /health, /agent/execute, /agent/traces, /metrics/agent, /onboarding/ingest
🔧 Comando:
copy backend-agents-main-FINAL.py "D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\backend-agents\app\main.py"

---

ARCHIVO 4
=========
📥 Descargá: backend-agents-onboarding_router-FINAL.py
📍 Copiar a: D:\...\agencia-web-b2b\backend-agents\app\onboarding_router.py
❓ Qué es: Router FastAPI para onboarding en backend-agents
📋 Contiene: POST /onboarding/ingest (LLM + Qdrant)
🔧 Comando:
copy backend-agents-onboarding_router-FINAL.py "D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\backend-agents\app\onboarding_router.py"

---

ARCHIVO 5
=========
📥 Descargá: backend-agents-onboarding_models.py
📍 Copiar a: D:\...\agencia-web-b2b\backend-agents\app\onboarding_models.py
❓ Qué es: Modelos Pydantic para formulario de onboarding
📋 Contiene: OnboardingForm, IngestResponse, Sede, Servicio, etc.
🔧 Comando:
copy backend-agents-onboarding_models.py "D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\backend-agents\app\onboarding_models.py"

---

ARCHIVO 6
=========
📥 Descargá: backend-agents-onboarding_service.py
📍 Copiar a: D:\...\agencia-web-b2b\backend-agents\app\onboarding_service.py
❓ Qué es: Lógica de ingesta (PostgreSQL + LLM + Qdrant)
📋 Contiene: setup_postgresql(), generate_deterministic_chunks(), process_document_with_llm(), store_in_qdrant(), run_ingestion_pipeline()
🔧 Comando:
copy backend-agents-onboarding_service.py "D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\backend-agents\app\onboarding_service.py"

---

RESUMEN VISUAL
==============

backend-saas\app\
├── main.py                    ← ARCHIVO 1 (backend-saas-main-FINAL.py)
├── onboarding_router.py       ← ARCHIVO 2 (backend-saas-onboarding_router-FINAL.py)
├── auth_router.py             (YA EXISTE, no toques)
├── auth_service.py            (YA EXISTE, no toques)
├── onboarding_service.py      (YA EXISTE, pero verifica que setup_postgresql() esté aquí)
└── ...

backend-agents\app\
├── main.py                    ← ARCHIVO 3 (backend-agents-main-FINAL.py)
├── onboarding_router.py       ← ARCHIVO 4 (backend-agents-onboarding_router-FINAL.py)
├── onboarding_models.py       ← ARCHIVO 5 (backend-agents-onboarding_models.py)
├── onboarding_service.py      ← ARCHIVO 6 (backend-agents-onboarding_service.py)
├── engine/
├── tools/
├── auth/
├── db/
├── lib/
└── ...

---

ORDEN DE COPIA (IMPORTANTE):
============================

1. Primero: backend-saas (2 archivos)
   - Copiar main.py
   - Copiar onboarding_router.py

2. Después: backend-agents (4 archivos)
   - Copiar onboarding_models.py
   - Copiar onboarding_service.py
   - Copiar onboarding_router.py
   - Copiar main.py (ÚLTIMO porque importa todo lo anterior)
