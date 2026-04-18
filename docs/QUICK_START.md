# Quick Start — Webshooks

Para desarrolladores nuevos que quieran levantar el proyecto rápidamente en local.

---

## 1️⃣ Requisitos Previos

```bash
# Verificar versiones
node --version        # 18+
python --version      # 3.10+
docker --version      # 20.10+
```

## 2️⃣ Clonar y Configurar

```bash
git clone https://github.com/fmonfasani/agencia-web-b2b.git
cd agencia-web-b2b

# Crear archivos .env
# Frontend
cp frontend/.env.example frontend/.env.local

# Backend SaaS
cp backend-saas/.env.example backend-saas/.env

# Backend Agents
cp backend-agents/.env.example backend-agents/.env
```

**Variables esenciales a configurar:**

```env
# frontend/.env.local
NEXT_PUBLIC_SAAS_API_URL=http://localhost:8000
NEXTAUTH_SECRET=<generar con: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3001

# backend-saas/.env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agencia_web_b2b_dev
LOG_LEVEL=INFO
BACKEND_AGENTS_URL=http://localhost:8001

# backend-agents/.env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agencia_web_b2b_dev
OLLAMA_BASE_URL=http://localhost:11434
DEFAULT_MODEL=gemma3:latest
```

---

## 3️⃣ Levantar Infraestructura

```bash
# Terminal 1: Docker (PostgreSQL, Qdrant, Redis, Ollama)
docker compose -f docker-compose.local.yml up -d

# Verifica que está todo corriendo
docker compose -f docker-compose.local.yml ps
```

**Servicios levantados:**
- PostgreSQL: `localhost:5432`
- Qdrant: `localhost:6333`
- Redis: `localhost:6379`
- Ollama: `localhost:11434`

---

## 4️⃣ Levantar Frontend

```bash
# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

✅ **Disponible en:** http://localhost:3001

**Credenciales de test:**
- Email: `admin@example.com`
- Password: `password123`

---

## 5️⃣ Levantar Backend SaaS

```bash
# Terminal 3: Backend SaaS
cd backend-saas
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload
```

✅ **Disponible en:** http://localhost:8000  
📚 **Swagger API:** http://localhost:8000/docs

---

## 6️⃣ Levantar Backend Agents

```bash
# Terminal 4: Backend Agents
cd backend-agents
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --port 8001 --reload
```

✅ **Disponible en:** http://localhost:8001  
📚 **Swagger API:** http://localhost:8001/docs

---

## 7️⃣ Verificar Setup Completo

```bash
# Test health endpoints
curl http://localhost:8000/health
curl http://localhost:8001/health

# Test login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# Debería retornar JSON con user + api_key
```

---

## 🎯 Flujo de Uso Básico

### 1. Login en Frontend
- Ir a http://localhost:3001/es/auth/sign-in
- Ingresar credenciales
- NextAuth crea session

### 2. Ver Dashboard
- http://localhost:3001/es/app
- KPI cards con colores ámbar (#F59E0B)
- Sidebar colapsable con fondo claro (#EDEBE6)

### 3. Entrenar Agente
- Ir a /app/training
- Upload documento (PDF, docx, txt)
- Se chunkeará y embebería en Qdrant

### 4. Ejecutar Agente
- Ir a /app/chat
- Escribir query
- Agente busca en Qdrant y responde
- Usa Ollama (local) o OpenRouter (fallback)

---

## 🔧 Comandos Útiles

### Restartear todo (limpio)

```bash
# Parar Docker
docker compose -f docker-compose.local.yml down -v

# Levantar de nuevo
docker compose -f docker-compose.local.yml up -d
```

### Ver logs

```bash
# Frontend
npm run dev  # Muestra logs en terminal

# Backend SaaS
uvicorn app.main:app --port 8000 --reload --log-level debug

# Backend Agents
uvicorn app.main:app --port 8001 --reload --log-level debug

# Docker
docker compose -f docker-compose.local.yml logs -f postgres
docker compose -f docker-compose.local.yml logs -f qdrant
```

### Conectarse a PostgreSQL

```bash
docker exec -it postgres psql -U postgres -d agencia_web_b2b_dev

# Una vez dentro, comandos útiles
\dt                    # Listar tablas
\d agent_sessions      # Describir tabla
SELECT * FROM users;   # Ver usuarios
```

### Resetear DB

```bash
# CUIDADO: Borra toda la data
docker exec -it postgres psql -U postgres -d agencia_web_b2b_dev -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Luego re-aplicar migrations
cd frontend && npx prisma migrate deploy
```

---

## 🐛 Troubleshooting Común

### "Port 3001 already in use"
```bash
lsof -i :3001 | awk 'NR!=1 {print $2}' | xargs kill -9
```

### "Cannot connect to PostgreSQL"
```bash
# Verifica que Docker está corriendo
docker ps | grep postgres

# Verifica DATABASE_URL
cat backend-saas/.env | grep DATABASE_URL
```

### "Module not found" en Python
```bash
# Reinstalar dependencias
pip install -r requirements.txt --force-reinstall
```

### "Ollama not available"
```bash
# Ollama debe estar corriendo en background
ollama serve &

# O descargar modelo
ollama pull gemma3:latest

# Test
curl http://localhost:11434/api/tags
```

### NextAuth redirect loop
```bash
# Verifica NEXTAUTH_SECRET está configurado
echo $NEXTAUTH_SECRET

# Verifica session
curl http://localhost:3001/api/auth/session
```

---

## 📚 Documentación Siguiente

Una vez que todo está corriendo:

1. **[PROJECT_STATUS.md](PROJECT_STATUS.md)** — Estado completo del proyecto
2. **[walkthrough.md](walkthrough.md)** — Arquitectura por fases
3. **[Infraestructura.md](Infraestructura.md)** — Docker y deployment
4. **[task.md](task.md)** — Tareas pendientes

---

## 💡 Tips

- **Commits frecuentes:** Usa `git commit -m "feat/fix: descripción"` después de cambios
- **Pre-commit hooks:** ESLint + Prettier se ejecutan automáticamente
- **Prisma migrations:** Después de cambios en `schema.prisma`, corre `npx prisma migrate dev`
- **Hot reload:** Todos los servicios tienen reload automático en desarrollo
- **Swagger APIs:** Experimenta con endpoints en `/docs` antes de escribir tests

---

**Última actualización:** 2026-04-18  
**¿Preguntas?** Ver sección Contacto en [README.md](../README.md)
