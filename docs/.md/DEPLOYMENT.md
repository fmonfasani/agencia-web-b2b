# 🚀 DEPLOYMENT GUIDE - Hetzner VPS

Plataforma de agentes inteligentes multi-tenant para la industria de la salud.

---

## 📋 Tabla de Contenidos

1. [Requisitos](#requisitos)
2. [Pre-Deploy Checklist](#pre-deploy-checklist)
3. [Configuración Inicial](#configuración-inicial)
4. [Deployment](#deployment)
5. [Post-Deploy](#post-deploy)
6. [SSL con Let's Encrypt](#ssl-con-lets-encrypt)
7. [Backup Strategy](#backup-strategy)
8. [Monitoring](#monitoring)
9. [Troubleshooting](#troubleshooting)

---

## requisitos

### VPS Hetzner (CX43.8 recomendado)
- **CPU:** Intel/AMD 8 vCores
- **RAM:** 16 GB
- **Storage:** 160 GB SSD
- **Traffic:** 20 TB incluido
- **Precio:** ~€12.49/mes

### Software
- Docker & Docker Compose (v2.8+)
- Nginx (reverse proxy + SSL)
- Domain name (ej: `webshooks.com` o subdominios)
- Acceso SSH a la VPS

### Puertos requeridos
- `80` - HTTP (redirect a HTTPS)
- `443` - HTTPS
- `5432` - PostgreSQL (solo interno Docker)
- `6333` - Qdrant API (solo interno Docker)
- `6379` - Redis (solo interno Docker)
- `11434` - Ollama (solo interno Docker)

---

## pre-deploy checklist

### ✅ Código
- [ ] Tests E2E pasan localmente
- [ ] Todos los endpoints funcionan con Swagger
- [ ] Archivos `.env.production` configurados
- [ ] Variables de entorno secretas preparadas
- [ ] Dockerfiles funcionan localmente (`docker build` sin errores)

### ✅ Base de datos
- [ ] Schema migrado (tablas creadas)
- [ ] Usuario admin creado (`POST /auth/register` + `POST /auth/activate`)
- [ ] Tenant de prueba creado y funcionando

### ✅ Seguridad
- [ ] API keys generadas para servicios internos
- [ ] Contraseñas seguras en `.env.production`
- [ ] ALLOWED_ORIGINS configurado con dominios reales
- [ ] Rate limiting habilitado

### ✅ Monitoreo
- [ ] Healthchecks configurados
- [ ] Logging a archivos configurado
- [ ] Backup script probado

---

## configuración inicial

### 1. Clonar en la VPS

```bash
# En tu máquina local, crear tar del proyecto (excluyendo node_modules, __pycache__, etc.)
tar -czf webshooks-platform.tar.gz \
  --exclude='node_modules' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='.git' \
  --exclude='frontend/.next' \
  --exclude='backend-*/__pycache__' \
  .

# Transferir a VPS
scp webshooks-platform.tar.gz root@tu-vps-ip:/tmp/

# En la VPS
ssh root@tu-vps-ip
cd /opt
tar -xzf /tmp/webshooks-platform.tar.gz
rm /tmp/webshooks-platform.tar.gz
cd agencia-web-b2b
```

### 2. Configurar variables de entorno

#### Editar `backend-saas/.env.production`
```bash
# Obligatorio cambiar:
DATABASE_URL=postgresql://postgres:TU_PASSWORD_SEGURO@postgres:5432/agencia_web_b2b
ALLOWED_ORIGINS=https://tudominio.com,https://admin.tudominio.com
DB_PASSWORD=TU_PASSWORD_SEGURO

# Opcional (defaults están bien):
ENVIRONMENT=production
LOG_LEVEL=WARNING
```

#### Editar `backend-agents/.env.production`
```bash
DATABASE_URL=postgresql://postgres:TU_PASSWORD_SEGURO@postgres:5432/agencia_web_b2b
ALLOWED_ORIGINS=https://tudominio.com,https://admin.tudominio.com

# Si usas OpenRouter (recomendado para producción):
LLM_PROVIDER=openrouter
OPENROUTER_API_KEYS=sk-or-v1-aaa,sk-or-v1-bbb,sk-or-v1-ccc
OPENROUTER_DEFAULT_MODEL=openai/gpt-4o-mini
```

### 3. Inicializar base de datos

Los schemas se crean automáticamente en el primer onboarding, pero puedes pre-crear las tablas:

```sql
-- En la VPS, conectarte a PostgreSQL:
docker exec -it agencia_postgres psql -U postgres -d agencia_web_b2b

-- Dentro de psql:
\i scripts/init-db.sql
```

---

## deployment

### Opción A: Usar deploy script (recomendado)

```bash
# Desde tu máquina local (una vez copiados los archivos a la VPS)
./scripts/deploy-prod.sh TU_VPS_IP root
```

El script:
1. Builda imágenes Docker
2. Copia `.env.production` a la VPS
3. `docker compose up -d` en la VPS
4. Espera healthchecks
5. Muestra logs iniciales

### Opción B: Manual paso a paso

```bash
# En la VPS
cd /opt/webshooks

# 1) Build imágenes
docker compose -f docker-compose.prod.yml build

# 2) Iniciar servicios
docker compose -f docker-compose.prod.yml up -d

# 3) Ver logs
docker compose -f docker-compose.prod.yml logs -f

# 4) Verificar que todo corre
./scripts/healthcheck.sh
```

---

## post-deploy

### 1. Verificar que todo funciona

```bash
# En la VPS
cd /opt/webshooks
./scripts/healthcheck.sh

# Deberías ver:
# ✅ Backend SaaS saludable
# ✅ Backend Agents saludable
# ✅ PostgreSQL saludable
# ✅ Qdrant saludable
# ✅ Redis saludable
# ✅ Ollama saludable
```

### 2. Probar flujo completo (API)

```bash
# Obtener API key del admin (desde DB o crear uno nuevo)
# Desde la VPS:
docker exec -it agencia_postgres psql -U postgres -d agencia_web_b2b -c "SELECT email, apiKey FROM \"User\" WHERE role='ADMIN';"

# Probar health
curl http://localhost:8000/health
# {"status":"ok","service":"backend-saas"}

curl http://localhost:8001/health
# {"status":"ok","service":"agent-engine"}
```

### 3. Configurar Nginx

```bash
# En la VPS, copiar nginx.conf a /etc/nginx/sites-available/webshooks
sudo cp scripts/nginx.conf /etc/nginx/sites-available/webshooks

# Editar Dominios
sudo nano /etc/nginx/sites-available/webshooks
# Cambiar tudominio.com por tu dominio real

# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/webshooks /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Obtener SSL (Let's Encrypt)

```bash
# Si usas certbot:
sudo certbot --nginx -d tudominio.com -d api.tudominio.com -d agents.tudominio.com

# O manual:
sudo certbot certonly --standalone -d tudominio.com
# Luego editar nginx.conf para usar las rutas correctas de certs
```

---

## ssl con lets encrypt

Una vez que Nginx esté funcionando:

```bash
# 1. Detener Nginx temporalmente (para que certbot use el puerto 80)
sudo systemctl stop nginx

# 2. Obtener certificado
sudo certbot certonly --standalone -d tudominio.com -d api.tudominio.com

# 3. Los certificados se guardan en:
# /etc/letsencrypt/live/tudominio.com/fullchain.pem
# /etc/letsencrypt/live/tudominio.com/privkey.pem

# 4. Iniciar Nginx
sudo systemctl start nginx

# 5. Auto-renew
sudo crontab -e
# Agregar: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## backup strategy

### Backup automático diario (cron)

```bash
# En la VPS
crontab -e

# Agregar (todos los días a las 2 AM):
0 2 * * * /opt/webshooks/scripts/backup.sh /opt/backups/webshooks >> /var/log/backup.log 2>&1
```

### Backup manual

```bash
cd /opt/webshooks
./scripts/backup.sh ./backups

# El backup se guarda como:
# ./backups/webshooks-backup-20260402T160000Z.tar.gz
```

### Restaurar backup

```bash
# 1. Extraer
tar -xzf webshooks-backup-YYYYMMDDTHHMMSSZ.tar.gz

# 2. Restaurar PostgreSQL
gunzip -c webshooks-backup-*/postgresql.sql.gz | \
  docker exec -i agencia_postgres psql -U postgres -d agencia_web_b2b

# 3. Restaurar Qdrant (parar contenedor primero)
docker compose -f docker-compose.prod.yml stop qdrant
docker cp webshooks-backup-*/qdrant_snapshot.tar agencia_qdrant:/qdrant/storage/snapshots/
# Restaurar desde snapshot (consultar docs de Qdrant)
docker compose -f docker-compose.prod.yml start qdrant

# 4. Restaurar Redis
docker compose -f docker-compose.prod.yml stop redis
docker cp webshooks-backup-*/redis_dump.rdb agencia_redis:/data/dump.rdb
docker compose -f docker-compose.prod.yml start redis
```

---

## monitoring

### Healthchecks básicos

```bash
# Script incluido
cd /opt/webshooks
./scripts/healthcheck.sh

# Configurar en Docker Compose (opcional)
# healthcheck ya definido en docker-compose.prod.yml
```

### Logs

```bash
# Ver logs de todos los servicios
docker compose -f docker-compose.prod.yml logs -f

# Logs específicos
docker compose -f docker-compose.prod.yml logs -f backend-saas
docker compose -f docker-compose.prod.yml logs -f backend-agents

# Logs con rotación automática (logrotate config en /etc/logrotate.d/)
```

### Métricas

- Backend-saas: `GET /metrics` (si se habilita)
- Backend-agents: `GET /metrics/agent` (requiere API key de admin/analista)
- PostgreSQL: `SELECT * FROM pg_stat_activity;`
- Qdrant: `GET http://localhost:6333/metrics`

---

## troubleshooting

### Problema: Contenedores no inician

```bash
# Ver estado
docker compose -f docker-compose.prod.yml ps

# Ver logs del servicio problemático
docker compose -f docker-compose.prod.yml logs [service_name]

# Reconstruir imágenes
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

### Problema: No conecta a PostgreSQL

```bash
# Verificar conexión desde backend
docker exec -it agencia_backend_saas ping postgres
docker exec -it agencia_backend_saas nc -zv postgres 5432

# Revisar credenciales en .env.production
cat backend-saas/.env.production | grep DATABASE_URL

# Probar conexión manual
docker exec -it agencia_postgres psql -U postgres -d agencia_web_b2b -c "\dt"
```

### Problema: Ollama no responde

```bash
# Verificar si el modelo está descargado
curl http://localhost:11434/api/tags

# Si está vacío, Ollama está descargando modelos (puede tardar 10-30 min)
# Verificar logs:
docker logs agencia_ollama

# Si falla, puedes:
# 1) Esperar a que descargue gemma3:latest y nomic-embed-text
# 2) O pre-pull los modelos en build (recomendado para prod)
```

### Problema: Rate limit muy agresivo

```bash
# Editar docker-compose.prod.yml
# En backend-saas y backend-agents, agregar variable:
environment:
  - RATE_LIMIT_PER_MINUTE=120  # o el valor que necesites

# O modificar el código en backend-saas/app/main.py (línea 46)
# limiter = Limiter(key_func=get_remote_address)  # default es 10/min
```

### Problema: Espacio en disco lleno

```bash
# Ver uso
df -h

# Limpiar Docker
docker system prune -a --volumes -f

# Limpiar backups antiguos
find /opt/backups -name "*.tar.gz" -mtime +30 -delete

# Logs grandes de PostgreSQL
docker exec agencia_postgres psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('agencia_web_b2b'));"
```

### Problema: Cannot connect to Qdrant

```bash
# Verificar que Qdrant está corriendo
docker ps | grep qdrant

# Ver logs
docker logs agencia_qdrant

# Probar API
curl http://localhost:6333/collections

# Si falla, verificar que el volumen tiene espacio
docker volume ls | grep qdrant
```

---

## apéndice

### Puertos internos Docker (default)

| Servicio | Puerto interno | Puerto host (prod) |
|----------|---------------|-------------------|
| backend-saas | 8000 | 8000 (solo local) → Nginx 443 |
| backend-agents | 8001 | 8001 (solo local) → Nginx 443 |
| postgres | 5432 | 5432 (solo local) |
| qdrant | 6333 | 6333 (solo local) |
| redis | 6379 | 6379 (solo local) |
| ollama | 11434 | 11434 (solo local) |

### Variables de entorno importantes

| Variable | Descripción | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | postgresql://postgres:pass@postgres:5432/agencia_web_b2b |
| `ALLOWED_ORIGINS` | CORS allowed origins | http://localhost:3001 |
| `LOG_LEVEL` | Nivel de logs | WARNING |
| `LLM_PROVIDER` | Provider: ollama o openrouter | ollama |
| `OPENROUTER_API_KEYS` | API keys OpenRouter (CSV) | (vacío) |
| `OLLAMA_MODEL` | Modelo local | gemma3:latest |
| `EMBEDDING_MODEL` | Modelo de embeddings | nomic-embed-text |

### Comandos útiles

```bash
# Ver estado de todos los contenedores
docker compose -f docker-compose.prod.yml ps

# Reiniciar un servicio específico
docker compose -f docker-compose.prod.yml restart backend-agents

# Ver recursos (CPU, RAM)
docker stats

# Entrar a un contenedor
docker exec -it agencia_backend_saas bash

# Ver logs en tiempo real
docker compose -f docker-compose.prod.yml logs -f

# Parar todo (mantener volúmenes)
docker compose -f docker-compose.prod.yml stop

# Parar todo y eliminar contenedores (NO volúmenes)
docker compose -f docker-compose.prod.yml down

# Parar todo y eliminar TODO (¡CUIDADO! borra datos)
docker compose -f docker-compose.prod.yml down -v
```

---

## 🎯 Lista final antes de ir a producción

- [ ] Dominio apunta a IP de Hetzner (DNS A record)
- [ ] Nginx configurado con SSL
- [ ] Firewall (ufw/firewalld) permite solo 80, 443
- [ ] Backups automáticos configurados (cron)
- [ ] Monitoreo de logs (logrotate o similar)
- [ ] Documentación de API pública (Swagger) deshabilitada o protegida en prod
- [ ] Rate limits ajustados
- [ ] SSL renewal configurado (cron de certbot)
- [ ] SSH acceso restringido (claves públicas, no password)
- [ ] Fail2ban instalado (protección brute-force)

---

**¿Problemas?** Consulta la sección [Troubleshooting](#troubleshooting) o revisa los logs de los contenedores.
