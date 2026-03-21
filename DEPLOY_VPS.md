# Despliegue Completo en VPS (DigitalOcean)

## Estructura del Proyecto

```
agencia-web-b2b/
├── src/                    # Frontend Next.js
├── prisma/                 # Schema de base de datos
├── agent-service/          # Backend Python/FastAPI
│   ├── main.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── docker-compose.yml
├── docker-compose.yml      # Docker principal (DB + servicios)
└── .env                    # Variables de entorno
```

## 1. Preparación del VPS

### Conectar al VPS
```bash
ssh root@134.209.41.51
```

### Instalar dependencias
```bash
# Actualizar sistema
apt update && apt upgrade -y

# Instalar Docker y Docker Compose
apt install -y docker.io docker-compose

# Habilitar Docker
systemctl enable docker
systemctl start docker

# Verificar instalación
docker --version
docker-compose --version
```

### Configurar Firewall (opcional pero recomendado)
```bash
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw allow 3001  # Frontend Next.js
ufw allow 8000  # Agent Service
ufw enable
```

## 2. Transferir el Proyecto al VPS

### Opción A: Git (recomendado)
```bash
# En tu máquina local
git remote add vps root@134.209.41.51:/root/agencia-web-b2b.git
git push vps main

# En el VPS
cd /root
git clone /root/agencia-web-b2b.git
```

### Opción B: SCP
```bash
# En tu máquina local
scp -r ./agencia-web-b2b root@134.209.41.51:/root/
```

## 3. Configurar Variables de Entorno

Crea el archivo `.env` en el VPS:

```bash
cd /root/agencia-web-b2b
nano .env
```

```env
# Base de datos (ya existe en el VPS)
POSTGRES_PRISMA_URL="postgresql://postgres:password@localhost:5432/agenciab2b"
POSTGRES_URL_NON_POOLING="postgresql://postgres:password@localhost:5432/agenciab2b"

# Next.js
NEXTAUTH_URL="http://134.209.41.51:3001"
NEXTAUTH_SECRET="genera-una-clave-secreta-larga"
AUTH_TRUST_HOST=true

# OpenAI (para el agent service)
OPENAI_API_KEY="sk-..."

# Agent Service
AGENT_SERVICE_URL="http://134.209.41.51:8000"

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN="..."

# Email (Resend)
RESEND_API_KEY="re_..."

# Sentry
SENTRY_DSN="..."

# Upstash (Rate Limiting)
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."
```

## 4. Configuración Unificada con Docker Compose

Crea un `docker-compose.prod.yml` unificado:

```bash
nano docker-compose.prod.yml
```

```yaml
version: '3.8'

services:
  # Base de datos PostgreSQL
  db:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD:-password}
      POSTGRES_DB: agenciab2b
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Frontend Next.js
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      db:
        condition: service_healthy
    restart: always
    volumes:
      - /root/agencia-web-b2b:/app
      - /app/node_modules
      - /app/.next

  # Agent Service (FastAPI/Python)
  agent-service:
    build:
      context: ./agent-service
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    env_file:
      - .env
    depends_on:
      db:
        condition: service_healthy
    restart: always
    volumes:
      - ./agent-service/widget:/app/widget

volumes:
  pgdata:
```

Crea el Dockerfile para el frontend:

```bash
nano Dockerfile.frontend
```

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npx prisma generate
RUN npx prisma migrate deploy || echo "Skipping migrations"

RUN npm run build

EXPOSE 3001

ENV NODE_ENV=production

CMD ["npm", "start"]
```

## 5. Despliegue

### Opción A: Sin Docker (desarrollo)
```bash
# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Instalar Python para el agent service
apt install -y python3 python3-pip python3-venv

# Frontend
cd /root/agencia-web-b2b
npm install
npm run build
npm start &

# Agent Service
cd /root/agencia-web-b2b/agent-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 &
```

### Opción B: Con Docker (producción)
```bash
cd /root/agencia-web-b2b

# Construir y levantar todos los servicios
docker-compose -f docker-compose.prod.yml up -d --build

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f

# Ver estado
docker-compose -f docker-compose.prod.yml ps
```

## 6. Configurar Nginx como Reverse Proxy

```bash
apt install -y nginx

nano /etc/nginx/sites-available/agencia
```

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    # Frontend Next.js
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Agent Service API
    location /api/agents/ {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket para Agent Service
    location /ws/ {
        proxy_pass http://localhost:8000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/agencia /etc/nginx/sites-enabled/
nginx -t
systemctl enable nginx
systemctl restart nginx
```

## 7. SSL con Let's Encrypt

```bash
apt install -y certbot python3-certbot-nginx

certbot --nginx -d tu-dominio.com
```

## 8. Configurar PM2 para Gestión de Procesos (alternativa a Docker)

```bash
# Instalar PM2
npm install -g pm2

# Frontend
cd /root/agencia-web-b2b
pm2 start npm --name "frontend" -- start
pm2 save

# Agent Service
cd /root/agencia-web-b2b/agent-service
pm2 start uvicorn --name "agent" -- main:app --host 0.0.0.0 --port 8000
pm2 save

# Iniciar PM2 al reiniciar
pm2 startup
```

## 9. Scripts de Gestión

### Iniciar todos los servicios
```bash
#!/bin/bash
# start-all.sh
cd /root/agencia-web-b2b
docker-compose -f docker-compose.prod.yml up -d
echo "Todos los servicios iniciados"
```

### Reiniciar todos los servicios
```bash
#!/bin/bash
# restart-all.sh
cd /root/agencia-web-b2b
docker-compose -f docker-compose.prod.yml restart
echo "Todos los servicios reiniciados"
```

### Ver logs
```bash
#!/bin/bash
# logs.sh
cd /root/agencia-web-b2b
docker-compose -f docker-compose.prod.yml logs -f --tail=100
```

## 10. Migraciones de Base de Datos

```bash
cd /root/agencia-web-b2b
npx prisma migrate deploy
npx prisma db seed
```

## 11. Verificación

```bash
# Verificar que los servicios están corriendo
curl http://localhost:3001  # Frontend
curl http://localhost:8000/health  # Agent Service

# Ver logs de Docker
docker-compose -f docker-compose.prod.yml logs

# Ver uso de recursos
docker stats
```

## URLs de Acceso

- **Frontend**: http://134.209.41.51:3001
- **Agent Service API**: http://134.209.41.51:8000
- **Agent Service Docs**: http://134.209.41.51:8000/docs

## Troubleshooting

### Agent Service no conecta a la DB
```bash
# Verificar que la base de datos está corriendo
docker-compose -f docker-compose.prod.yml ps db

# Ver logs de la DB
docker-compose -f docker-compose.prod.yml logs db
```

### Frontend no conecta al Agent Service
```bash
# Verificar que AGENT_SERVICE_URL está configurado correctamente en .env
# Debe ser http://agent-service:8000 si usas Docker networking
# o http://localhost:8000 si accedes directamente
```

### Reiniciar todo desde cero
```bash
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d
```
