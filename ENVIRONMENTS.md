# 🔧 Gestión de Ambientes

## Estructura de Ambientes

Este proyecto tiene **3 ambientes completamente separados**:

| Aspecto | Desarrollo Local | Staging | Producción |
|---------|------------------|---------|-----------|
| **Ubicación** | Tu máquina (localhost) | Servidor remoto | Servidor remoto |
| **Base de datos** | `agencia_web_b2b_dev` | `agencia_web_b2b_staging` | `agencia_web_b2b_prod` |
| **Docker Compose** | `backend-saas/docker-compose.yml` | `docker-compose.staging.yml` | `docker-compose.prod.yml` |
| **Frontend URL** | `http://localhost:3001` | `https://staging.tudominio.com` | `https://tudominio.com` |
| **Backend URL** | `http://localhost:8000` | `https://api-staging.tudominio.com` | `https://api.tudominio.com` |
| **Config Files** | `.env` / `.env.local` | `.env.staging` | `.env.production` |

---

## 🚀 Desarrollo Local

### Setup Inicial

```bash
# 1. Clonar repo
git clone <repo>
cd agencia-web-b2b

# 2. Instalar dependencias (Frontend)
cd frontend
npm install

# 3. Crear .env local (copiar del .env.example)
cd backend-saas
cp .env.example .env

cd ../backend-agents
cp .env.example .env

# 4. Iniciar Docker (desde backend-saas/)
cd backend-saas
docker-compose up -d

# 5. Ejecutar migraciones Prisma (desde frontend/)
cd ../frontend
DATABASE_URL="postgresql://postgres:Karaoke27570Echeverria@127.0.0.1:5432/agencia_web_b2b_dev" \
POSTGRES_PRISMA_URL="postgresql://postgres:Karaoke27570Echeverria@127.0.0.1:5432/agencia_web_b2b_dev" \
POSTGRES_URL_NON_POOLING="postgresql://postgres:Karaoke27570Echeverria@127.0.0.1:5432/agencia_web_b2b_dev" \
npx prisma db push --force-reset

# 6. Iniciar Frontend
npm run dev
```

### Archivos de Configuración Local

**backend-saas/**
```
.env                    ← Desarrollo (GITIGNORED)
.env.example           ← Template (COMMITEADO)
.env.production        ← Producción (GITIGNORED)
.env.production.template ← Producción template (COMMITEADO)
```

**backend-agents/**
```
.env                    ← Desarrollo (GITIGNORED)
.env.example           ← Template (COMMITEADO)
.env.production        ← Producción (GITIGNORED)
```

**frontend/**
```
.env                    ← Desarrollo general
.env.local             ← Desarrollo local (GITIGNORED)
```

### Acceder al Sistema Local

1. **Frontend:** http://localhost:3001
2. **Backend API:** http://localhost:8000
3. **API Docs (Swagger):** http://localhost:8000/docs
4. **Database:** `postgresql://postgres@127.0.0.1:5432/agencia_web_b2b_dev`
5. **Ollama:** http://localhost:11434

---

## 📊 Base de Datos

### Desarrollo Local

```bash
# Nombre: agencia_web_b2b_dev
# Host: localhost (Docker: postgres)
# Puerto: 5432
# Usuario: postgres
# Contraseña: Karaoke27570Echeverria

# Conectar con psql
psql -h 127.0.0.1 -U postgres -d agencia_web_b2b_dev

# Resetear BD completamente (destructivo!)
cd frontend
DATABASE_URL="postgresql://postgres:Karaoke27570Echeverria@127.0.0.1:5432/agencia_web_b2b_dev" \
npx prisma db push --force-reset --accept-data-loss
```

### Producción

```bash
# Nombre: agencia_web_b2b_prod
# Host: prod-db.aws.com (cambiar en .env.production)
# Puerto: 5432
# Usuario: postgres
# Contraseña: CAMBIAR EN .env.production

# NO RESETEAR NUNCA EN PRODUCCIÓN ❌
# Usar migraciones en su lugar
```

---

## 🐳 Docker Compose - Cuál Usar

### Desarrollo Local

```bash
cd backend-saas
docker-compose up -d
```

**Qué hace:**
- Levanta: PostgreSQL, Redis, Qdrant, Ollama, Backend-Saas, Backend-Agents
- Base de datos: `agencia_web_b2b_dev`
- Puertos: localhost:5432, :8000, :8001, :6333, :6379, :11434

### Producción

```bash
docker-compose -f docker-compose.prod.yml up -d
```

**Qué hace:**
- Levanta: PostgreSQL, Redis, Qdrant, Ollama, Backend-Saas, Backend-Agents (en producción)
- Base de datos: `agencia_web_b2b_prod`
- Carga `.env.production` para cada servicio
- Mayor logging, sin debug, timeouts ajustados

---

## 🔐 Contraseñas y Credenciales

### Desarrollo

- PostgreSQL: `Karaoke27570Echeverria`
- Redis: (vacío, sin autenticación)
- NextAuth Secret: Ver `.env.local`
- Google OAuth: Ver `.env`

**⚠️ IMPORTANTE:** Estas credenciales están hardcodeadas en desarrollo. Nunca compartir o exponer.

### Producción

- PostgreSQL: CAMBIAR EN `.env.production` (NO usar `Karaoke27570Echeverria`)
- Redis: CAMBIAR EN `.env.production`
- Credenciales: Usar AWS Secrets Manager / Vault (futuro)

---

## ✅ Checklist: Antes de Deployar

- [ ] Cambiar `POSTGRES_PASSWORD` en `.env.production`
- [ ] Cambiar `POSTGRES_HOST` en `.env.production` a host remoto real
- [ ] Cambiar `ALLOWED_ORIGINS` en `.env.production`
- [ ] Cambiar `NEXTAUTH_URL` en frontend
- [ ] Cambiar URLs de backend-agents
- [ ] Revisar logs en producción
- [ ] Hacer backup de BD antes de migrar
- [ ] Probar en staging primero
- [ ] NO correr `docker-compose down -v` en producción (pierde datos)

---

## 🚨 Troubleshooting

### "relation "User" does not exist"

```bash
# Ejecutar migraciones Prisma
cd frontend
DATABASE_URL="postgresql://postgres:Karaoke27570Echeverria@127.0.0.1:5432/agencia_web_b2b_dev" \
npx prisma db push
```

### "CORS error - No Access-Control-Allow-Origin"

Verificar que `ALLOWED_ORIGINS` en `.env` incluya tu URL frontend:
```
ALLOWED_ORIGINS=http://localhost:3001
```

### Puerto ya en uso

```bash
# Matar proceso en puerto 3001
npx kill-port 3001

# Matar proceso en puerto 8000
docker kill backend-saas-backend-saas-1
```

### Docker no tiene espacio

```bash
docker system prune -a
docker volume prune
```

---

## 📝 Resumen Rápido

| Tarea | Comando |
|-------|---------|
| Iniciar desarrollo | `cd backend-saas && docker-compose up -d` |
| Iniciar frontend | `cd frontend && npm run dev` |
| Resetear BD dev | `npx prisma db push --force-reset --accept-data-loss` |
| Ver logs backend | `docker logs backend-saas-backend-saas-1 -f` |
| Parar todo | `docker-compose down` |
| Borrar volúmenes | `docker-compose down -v` |

---

## 🔗 URLs por Ambiente

### Desarrollo Local
- Frontend: http://localhost:3001
- Backend: http://localhost:8000/docs
- BD: postgresql://postgres@127.0.0.1:5432/agencia_web_b2b_dev

### Producción
- Frontend: https://tudominio.com
- Backend: https://api.tudominio.com/docs
- BD: postgresql://postgres@prod-db.aws.com:5432/agencia_web_b2b_prod
