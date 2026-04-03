# 🚀 DEPLOYMENT CHECKLIST - Webshooks Platform

**Estado:** Listo para Deploy en VPS  
**Última Actualización:** 2026-04-02

---

## ✅ PRE-DEPLOYMENT (Local Verification)

### Código & Swagger ✅
- [x] Swagger documentation completa en `/docs`
- [x] Todos los endpoints documentados con ejemplos
- [x] API Gateway pattern implementado (backend-saas ↔ backend-agents)
- [x] X-API-Key propagation fixed en proxy endpoints
- [x] Health checks configurados

### Configuración ✅
- [x] `.env.production` creados en backend-saas
- [x] `.env.production` creados en backend-agents
- [x] `docker-compose.prod.yml` listo
- [x] `scripts/setup-vps.sh` preparado
- [x] `scripts/deploy-prod.sh` preparado
- [x] `scripts/preflight-check.sh` listo

### Base de Datos ✅
- [x] Schema migrations exist en `backend-saas/app/db/migrations`
- [x] PostgreSQL container configurado en docker-compose
- [x] Init script exists: `scripts/init-db.sql`

---

## 🔧 DEPLOYMENT STEPS (En la VPS)

### 1. Preparar VPS
```bash
ssh root@your-vps-ip

# Instalar requisitos
apt update && apt install -y curl docker.io docker-compose-plugin

# Verificar Docker
docker --version
docker compose version

# Crear directorio de aplicación
mkdir -p /opt/webshooks
cd /opt/webshooks
```

### 2. Transferir código a VPS
```bash
# En tu máquina local
tar -czf webshooks-platform.tar.gz \
  --exclude='node_modules' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='.git' \
  --exclude='frontend/.next' \
  .

scp webshooks-platform.tar.gz root@your-vps-ip:/tmp/

# En la VPS
cd /opt/webshooks
tar -xzf /tmp/webshooks-platform.tar.gz
rm /tmp/webshooks-platform.tar.gz
```

### 3. Configurar Variables de Entorno (CRÍTICO)
```bash
cd /opt/webshooks

# Crear archivo .env para docker-compose
cat > .env << 'ENVEOF'
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=YOUR_STRONG_PASSWORD_HERE
POSTGRES_DB=agencia_web_b2b

# Redis
REDIS_PASSWORD=YOUR_REDIS_PASSWORD_HERE

# Ollama
OLLAMA_MODEL=gemma3:latest

# Domain
DOMAIN=your-domain.com
ENVIRONMENT=production
ENVEOF

# Editar con valores reales
nano .env
```

### 4. Ejecutar Script de Setup
```bash
chmod +x scripts/setup-vps.sh
./scripts/setup-vps.sh
```

**Lo que hace:**
- Verifica requisitos (Docker, RAM, CPU)
- Crea directorios necesarios
- Configura permisos
- Corre health checks

### 5. Desplegar con Docker Compose
```bash
# Usar docker-compose.prod.yml
docker compose -f docker-compose.prod.yml up -d

# Verificar que todos los servicios están corriendo
docker compose ps

# Ver logs
docker compose logs -f backend-saas
docker compose logs -f backend-agents
docker compose logs -f ollama
```

### 6. Inicializar Base de Datos
```bash
# Crear usuario admin
docker compose exec backend-saas python -m app.db.seed

# Verificar migración
docker compose exec postgres psql -U postgres -d agencia_web_b2b -c "\dt"
```

### 7. Configurar Nginx (Reverse Proxy + SSL)
```bash
# Instalar Nginx
apt install -y nginx certbot python3-certbot-nginx

# Copiar configuración
cp scripts/nginx.conf /etc/nginx/sites-available/webshooks
ln -s /etc/nginx/sites-available/webshooks /etc/nginx/sites-enabled/

# Editar con tu dominio
nano /etc/nginx/sites-available/webshooks

# Obtener SSL Certificate
certbot certonly --standalone -d your-domain.com

# Restart Nginx
systemctl restart nginx
```

### 8. Verificar Deployment
```bash
# Health check backend-saas
curl -s https://your-domain.com/health | jq

# Health check backend-agents
curl -s http://localhost:8001/health | jq

# Ver logs de errores
docker compose logs --tail=50
```

### 9. Ejecutar Tests E2E Contra Producción (OPCIONAL)
```bash
./scripts/test-e2e.sh https://your-domain.com wh_your_api_key
```

---

## 🔒 SEGURIDAD - POST-DEPLOYMENT

### Cambiar Contraseñas Administrativas
- [ ] Cambiar contraseña PostgreSQL en la VPS
- [ ] Cambiar contraseña Redis en la VPS
- [ ] Cambiar contraseña admin en `/auth/login`

### Firewall & Acceso
- [ ] Bloquear puerto 5432 (PostgreSQL) desde internet
- [ ] Bloquear puerto 6333 (Qdrant) desde internet
- [ ] Bloquear puerto 11434 (Ollama) desde internet
- [ ] Solo permitir puertos 80 (HTTP) y 443 (HTTPS)

### Monitoreo
- [ ] Configurar logs en `/var/log/webshooks/`
- [ ] Backup diario: `scripts/backup.sh`
- [ ] Health checks cada 5min: `scripts/healthcheck.sh`

---

## 📊 ENDPOINTS DISPONIBLES POST-DEPLOY

| Endpoint | URL | Auth |
|----------|-----|------|
| Swagger UI | `https://your-domain.com/docs` | None |
| ReDoc | `https://your-domain.com/redoc` | X-API-Key |
| Health | `https://your-domain.com/health` | None |
| Login | `POST https://your-domain.com/auth/login` | None |
| Agent Execute | `POST https://your-domain.com/agent/execute` | X-API-Key |

---

## 🔧 TROUBLESHOOTING

### Backend-saas no responde
```bash
docker compose logs backend-saas
docker compose exec backend-saas python -m pytest tests/
```

### Ollama model no descargado
```bash
docker compose exec ollama ollama pull gemma3:latest
docker compose exec ollama ollama list
```

### PostgreSQL connection error
```bash
docker compose exec postgres psql -U postgres -d agencia_web_b2b -c "SELECT 1"
```

### Qdrant not indexing vectors
```bash
curl http://localhost:6333/health
curl http://localhost:6333/collections
```

---

## 📝 COMANDOS ÚTILES EN PRODUCCIÓN

```bash
# Restart servicios específicos
docker compose restart backend-saas
docker compose restart ollama

# Ver tamaño de BD
docker compose exec postgres psql -U postgres -d agencia_web_b2b -c "SELECT pg_size_pretty(pg_database_size('agencia_web_b2b'));"

# Backup manual
docker compose exec postgres pg_dump -U postgres agencia_web_b2b > backup.sql

# Restore from backup
docker compose exec -T postgres psql -U postgres agencia_web_b2b < backup.sql

# View all logs
docker compose logs --tail=100 -f
```

---

## ✅ VALIDACIÓN FINAL

Antes de considerar "deployment completo":

- [ ] `curl https://your-domain.com/health` retorna 200 ✅
- [ ] `curl https://your-domain.com/docs` muestra Swagger UI
- [ ] Login funciona: `POST /auth/login`
- [ ] Agent query funciona: `POST /agent/execute`
- [ ] Certificado SSL válido (no warnings)
- [ ] Logs no muestran errores críticos
- [ ] Backups están siendo creados

---

**Cuando todo esté ✅, el deployment está LISTO en producción!**

