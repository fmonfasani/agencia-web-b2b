# Webshooks — Plataforma SaaS Multi-Tenant de Agentes IA

![Status](https://img.shields.io/badge/Status-Production%20Ready-green?style=for-the-badge&logo=rocket)
![Stack](https://img.shields.io/badge/Stack-Next.js%2016%20%7C%20FastAPI%20%7C%20PostgreSQL%20%7C%20LangGraph-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-orange?style=for-the-badge)

---

## 📖 Documentación Principal

**Para entender el estado actual completo del proyecto:**

👉 **[PROJECT_STATUS.md](docs/PROJECT_STATUS.md)** — Documento consolidado con:
- Arquitectura completa
- Stack tecnológico
- Estructura de directorios
- Diseño visual (Warm Neutral)
- Infraestructura Docker
- Guías de deployment
- Roadmap futuro

---

## 🚀 Inicio Rápido

### Requisitos Previos
- Docker + Docker Compose
- Node.js 18+
- Python 3.10+
- Ollama (opcional pero recomendado)

### Desarrollo Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/fmonfasani/agencia-web-b2b.git
cd agencia-web-b2b

# 2. Levantar infraestructura (PostgreSQL, Qdrant, Redis, Ollama)
docker compose -f docker-compose.local.yml up -d

# 3. Frontend (en terminal 1)
cd frontend
npm install
npm run dev  # http://localhost:3001

# 4. Backend SaaS (en terminal 2)
cd backend-saas
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload

# 5. Backend Agents (en terminal 3)
cd backend-agents
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --port 8001 --reload
```

**APIs Swagger:**
- Backend SaaS: http://localhost:8000/docs
- Backend Agents: http://localhost:8001/docs
- Frontend: http://localhost:3001

---

## 📚 Documentación por Tema

### Arquitectura & Diseño
- [PROJECT_STATUS.md](docs/PROJECT_STATUS.md) — Estado completo actual
- [Infraestructura.md](docs/Infraestructura.md) — Docker, bases de datos, deployment
- [walkthrough.md](docs/walkthrough.md) — Walkthrough técnico fases 1-4

### Deployment
- [ENVIRONMENTS.md](ENVIRONMENTS.md) — Variables de entorno
- [Infraestructura.md](docs/Infraestructura.md) — Docker, cloud setup, firewall

### Testing
- [E2E_TEST.md](E2E_TEST.md) — Testing end-to-end
- `backend-saas/tests/` — Unit tests FastAPI
- `backend-agents/tests/` — Unit tests LangGraph

### Seguridad
- [Security/secret-rotation.md](docs/Security/secret-rotation.md) — Rotación de credenciales
- [Infraestructura.md](docs/Infraestructura.md) — Sección 5: Seguridad Firewall

### Tasks & Roadmap
- [task.md](docs/task.md) — Tareas pendientes y en progreso

---

## 🏗️ Estructura del Proyecto

```
agencia-web-b2b/
├── frontend/                 # Next.js 16 (port 3001)
│   ├── src/
│   │   ├── app/
│   │   │   ├── [locale]/app/       # Zona cliente
│   │   │   └── [locale]/admin/     # Zona admin
│   │   ├── components/
│   │   │   ├── layouts/            # Layouts con sidebar colapsable
│   │   │   ├── dashboard/          # Componentes dashboard
│   │   │   └── ui/                 # Componentes UI reutilizables
│   │   └── lib/
│   └── prisma/                     # ORM schema + migrations
│
├── backend-saas/             # FastAPI (port 8000)
│   ├── app/
│   │   ├── routers/          # Auth, Tenant, Training, Notifications, Reports
│   │   ├── services/         # Lógica de negocios
│   │   ├── db/               # Connection pooling, models
│   │   └── middleware/       # CORS, Security, Tenant validation
│   └── requirements.txt
│
├── backend-agents/           # FastAPI (port 8001)
│   ├── app/
│   │   ├── routers/          # Agent execution
│   │   ├── services/         # LangGraph engine, LLM, RAG, Sessions
│   │   ├── tools/            # Search, Scrape tools
│   │   └── middleware/       # Security
│   └── requirements.txt
│
├── docker-compose.prod.yml   # Producción (DigitalOcean)
├── docker-compose.local.yml  # Desarrollo local
│
└── docs/                      # Documentación
    ├── PROJECT_STATUS.md      # ⭐ Lee esto primero
    ├── Infraestructura.md
    ├── walkthrough.md
    ├── task.md
    └── Security/
```

---

## 🎨 Diseño Visual (Warm Neutral, 2026-04-18)

**Paleta actualizada:** Colores cálidos y neutrales tipo Notion/Linear

| Elemento | Color | Uso |
|----------|-------|-----|
| Background | #F1EFEA | Fondo principal (cálido, no azulado) |
| Sidebar | #EDEBE6 | Colapsable con hover expand |
| Accent | #F59E0B | Botones, elementos interactivos (ámbar) |
| Texto primario | #1C1C1C | Títulos, contenido |
| Texto secundario | #9A9A9A | Labels, metadata |
| Status Green | #1F7A63 | Positivo, uptrend |
| Status Blue | #3B82F6 | Info, "nuevo" |
| Status Purple | #8B5CF6 | Especial, "contactado" |

**Cambios recientes:**
- Sidebar colapsable en cliente y admin
- KPI cards con accent ámbar (#F59E0B)
- Tablas con paleta warm neutral
- Badges semánticos actualizados
- Botones: primario negro (#111111) + accent ámbar

---

## 🔐 Autenticación & Multi-Tenant

- **NextAuth v5:** Credentials-based (email + password)
- **Backend:** `/auth/login` retorna session + API key (`wh_xxxxx`)
- **RBAC:** 6 roles - SUPER_ADMIN, ADMIN, ANALISTA, CLIENTE, MEMBER, VIEWER
- **API Key Rotation:** `POST /auth/rotate-key` invalida key anterior inmediatamente
- **Multi-Tenant:** Cada usuario accede solo a su tenant; admins pueden cross-tenant

---

## 🤖 Motor de Agentes IA

**LangGraph Engine:**
```
Query → RAG (Qdrant) → Planner (LLM) → Tool Executor (search/scrape) → Response
```

**Características:**
- ✅ Session persistence (historial de conversaciones)
- ✅ Multi-LLM: Ollama (local) + OpenRouter (cloud, fallback)
- ✅ RAG con búsqueda vectorial en Qdrant
- ✅ Herramientas: búsqueda y scraping
- ✅ Trazabilidad: traces con request_id, duration, finish_reason

---

## 🐳 Infraestructura

**Stack:**
- PostgreSQL 16 (datos)
- Qdrant (vectores)
- Redis (cache + queue)
- Ollama (LLM local, modelo: gemma3)
- Docker Compose (orquestación)

**Cloud:**
- DigitalOcean Droplet (Ubuntu 24.04 LTS, NYC3)
- Cloud Firewall (port-level security)

**Healthchecks:**
Todos los servicios tienen healthchecks automáticos. Ver `docker-compose.prod.yml`.

---

## 🧪 Testing

```bash
# E2E tests (frontend)
cd frontend && npm run test:e2e

# Unit tests (backend)
cd backend-saas && pytest tests/ -v
cd backend-agents && pytest tests/ -v

# Test e2e manual
python backend-saas/test_e2e_30.py
```

---

## 🚀 Deployment

### Checklist Pre-Deployment

```bash
# 1. Verifica cero credenciales en código
grep -r "password\|secret" backend-saas backend-agents --include="*.py"  # 0 matches

# 2. Verifica health endpoints
curl http://localhost:8000/health
curl http://localhost:8001/health

# 3. Verifica environment variables
echo $DATABASE_URL, $NEXTAUTH_SECRET, etc.

# 4. Verifica migrations
cd frontend && npx prisma migrate status

# 5. Run tests
npm run test:e2e
```

### Deploy en DigitalOcean

```bash
ssh root@your-droplet-ip

cd /path/to/agencia-web-b2b
git pull origin main

docker compose -f docker-compose.prod.yml build --no-cache backend-saas backend-agents
docker compose -f docker-compose.prod.yml up -d --force-recreate

# Verifica
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --follow backend-saas
```

---

## 🆘 Troubleshooting

### Port ya en uso (3001, 8000, 8001)

```bash
# Matar proceso en puerto
lsof -i :3001 | awk 'NR!=1 {print $2}' | xargs kill -9
```

### PostgreSQL connection error

```bash
# Verifica que Docker está corriendo
docker ps | grep postgres

# Verifica connection string
echo $DATABASE_URL
```

### LLM no responde

```bash
# Verifica Ollama está corriendo
ollama serve &

# Verifica modelo está descargado
ollama list | grep gemma3

# Si no, descargalo
ollama pull gemma3:latest
```

---

## 📊 Commits Recientes

```
42111c0 fix: remove any types from ClientLayoutContent and clean up duplicate frontend directory
7c3f000 feat: implement warm neutral design system v3 with collapsable sidebar
ecc5af4 fix: remove unimplemented initiateCheckout import
eb0cf7a fix: use inline styles instead of dynamic tailwind classes in KPICard
```

---

## 🤝 Contribuir

1. Crear rama: `git checkout -b feature/tu-feature`
2. Commit: `git commit -m "feat: descripción clara"`
3. Push: `git push origin feature/tu-feature`
4. PR en GitHub

**Pre-commit hooks:** ESLint + Prettier se ejecutan automáticamente.

---

## 📞 Contacto

- **Propietario:** Federico Monfasani (fmonfasani@gmail.com)
- **Repositorio:** https://github.com/fmonfasani/agencia-web-b2b
- **Issues:** GitHub Issues
- **Docs:** `/docs`

---

## 📝 Changelog

### 2026-04-18
- ✨ Diseño Warm Neutral v3 con paleta colores actualizada
- ✨ Sidebar colapsable con hover expand en cliente y admin
- 🐛 Fixed: ESLint @typescript-eslint/no-explicit-any violations
- 🧹 Cleaned: Removed duplicate frontend/frontend/ directory
- 📚 Created: PROJECT_STATUS.md documento consolidado

### 2026-04-10
- ✅ 13 vulnerabilidades de seguridad resueltas
- ✨ API Key rotation completo
- ✨ Connection pooling en PostgreSQL

### 2026-04-01
- 🎉 Production ready: Backend SaaS + Backend Agents
- ✨ LangGraph motor de agentes completo
- ✨ Multi-LLM support (Ollama + OpenRouter)
- ✨ Session persistence implementado

---

**Última actualización:** 2026-04-18  
**Versión:** 3.0 (Warm Neutral Design + Colapsable Sidebar)  
**Rama activa:** main
