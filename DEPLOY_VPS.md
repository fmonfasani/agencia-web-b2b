# 🚀 Guía de Despliegue Profesional: Plataforma Agencia B2B AI

> [!IMPORTANT]
> **SI YA TIENES EL SISTEMA EN VIVO (MIGRACIÓN INCREMENTAL)**
> No reinstales todo. Sigue estos pasos para actualizar el código sin perder datos de tu base de datos actual:
>
> 1. **Backup urgente:** `docker exec agencia-db pg_dump -U postgres agencia_web_b2b > backup_pre_update.sql`
> 2. **Actualizar código:** `git pull origin main`
> 3. **Migrar DB (Tablas de MercadoPago):** `npx prisma migrate deploy`
> 4. **Sembrar Planes:** `npx tsx prisma/seed-plans.ts`
> 5. **Reiniciar servicios:** `docker-compose -f docker-compose.prod.yml restart frontend agent-service`

Este documento detalla el proceso de despliegue optimizado en una VPS (DigitalOcean). Hemos configurado una arquitectura **100% Dockerizada e Inmutable** para máxima seguridad y escalabilidad.

---

## 🏗️ 1. Estructura del Proyecto en el VPS

```text
/root/agencia-web-b2b/
├── Dockerfile.frontend        # Imagen inmutable de Next.js
├── docker-compose.prod.yml    # Orquestador (Frontend + Agent + DB)
├── .env                       # Variables de entorno críticas
├── prisma/                    # Esquema y migraciones
└── agent-service/             # Backend Python (FastAPI)
```

---

## 🛠️ 2. Preparación Inicial del VPS

1. **Acceder:** `ssh root@134.209.41.51`
2. **Instalar Docker Engine:**
   ```bash
   apt update && apt upgrade -y
   apt install -y docker.io docker-compose ufw
   systemctl enable --now docker
   ```
3. **Firewall (UFW):** Solo abrimos lo estrictamente necesario.
   ```bash
   ufw allow 22, 80, 443
   ufw enable
   ```
   _Nota: No abrimos el puerto 5432 (PostgreSQL) hacia el exterior por seguridad. Las apps hablarán con la DB por la red interna de Docker._

---

## 🌍 3. Variables de Entorno (.env) en el VPS

Crea el archivo `.env` en `/root/agencia-web-b2b/`.
**⚠️ IMPORTANTE: Usamos el nombre del servicio `db` en lugar de `localhost`.**

```env
# --- Base de Datos (Interna de Docker) ---
# Usamos 'db:5432' porque es el nombre del servicio en docker-compose
DATABASE_URL="postgresql://postgres:TU_PASS_SEGURA@db:5432/agencia_web_b2b?sslmode=disable"
POSTGRES_PRISMA_URL="postgresql://postgres:TU_PASS_SEGURA@db:5432/agencia_web_b2b?sslmode=disable"
POSTGRES_URL_NON_POOLING="postgresql://postgres:TU_PASS_SEGURA@db:5432/agencia_web_b2b?sslmode=disable"

# --- Next.js (Frontend) ---
NEXTAUTH_URL="https://tu-dominio.com"
NEXTAUTH_SECRET="genera-algo-largo-con-openssl-rand-base64-32"
AUTH_TRUST_HOST=true

# --- Servicios AI (Agent Backend) ---
# Desde el frontend, accedemos al backend por DNS interno de docker
AGENT_SERVICE_URL="http://agent-service:8000"
INTERNAL_API_SECRET="tu-secreto-compartido-hex"
ADMIN_SECRET="tu-admin-secret"
GEMINI_API_KEY="AI..."
APIFY_API_TOKEN="apify_..."
```

---

## 🐳 4. Orquestación con Docker Compose (Producción)

### `docker-compose.prod.yml`

```yaml
version: "3.8"

services:
  db:
    image: postgres:15-alpine
    container_name: agencia-db
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD:-TU_PASS_SEGURA}
      POSTGRES_DB: agencia_web_b2b
    # No exponemos puertos al VPS por seguridad. Solo red interna.
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    container_name: agencia-frontend
    ports:
      - "3001:3001"
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
    restart: always

  agent-service:
    build:
      context: ./agent-service
      dockerfile: Dockerfile
    container_name: agencia-agents
    ports:
      - "8000:8000"
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
    restart: always

volumes:
  pgdata:
```

### `Dockerfile.frontend` (Imagen Inmutable)

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3001
CMD ["npm", "start"]
```

---

## 🚀 5. Proceso de Despliegue (Run)

Para desplegar por primera vez o ante cambios:

1. **Subir cambios:** `git push origin main`
2. **En el VPS:**

   ```bash
   cd /root/agencia-web-b2b
   git pull origin main

   # 1. Construir imágenes
   docker-compose -f docker-compose.prod.yml build

   # 2. Levantar la base de datos primero para migrar
   docker-compose -f docker-compose.prod.yml up -d db

   # 3. Correr migraciones manualmente (Paso CRÍTICO y seguro)
   # Esto usa un contenedor temporal para no ensuciar el de producción
   docker run --rm --network agencia-web-b2b_default \
     -v $(pwd):/app -w /app node:20-alpine \
     sh -c "npx prisma migrate deploy && npx tsx prisma/seed-plans.ts"

   # 4. Levantar todo el sistema
   docker-compose -f docker-compose.prod.yml up -d
   ```

---

## 🛡️ 6. Proxy Inverso con Nginx (Exponer a Internet)

Instala Nginx en el host para manejar el tráfico HTTPS y los dominios.

```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3001; # Next.js
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/agents/ {
        proxy_pass http://localhost:8000/; # Agent Service
        proxy_set_header Host $host;
    }
}
```

---

## 📝 7. Mantenimiento y Logs

- **Ver logs de todo:** `docker-compose -f docker-compose.prod.yml logs -f --tail=100`
- **Revisar DB:** `docker exec -it agencia-db psql -U postgres -d agencia_web_b2b`
- **Backup de DB:** `docker exec agencia-db pg_dumpall -c -U postgres > backup.sql`
