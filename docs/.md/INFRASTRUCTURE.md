# 🔧 INFRASTRUCTURE - Webshooks Platform

**Última Actualización:** 2026-04-02
**Versión:** 1.0 - Production Ready
**Deployment Target:** Hetzner VPS (CX43.8)

---

## 📋 Tabla de Contenidos

1. [Infrastructure Components](#infrastructure-components)
2. [Docker Architecture](#docker-architecture)
3. [Deployment Guide](#deployment-guide)
4. [Production Configuration](#production-configuration)
5. [Monitoring & Health Checks](#monitoring--health-checks)
6. [Backup & Recovery](#backup--recovery)

---

## Infrastructure Components

### Services & Ports

| Service | Port | Type | Internal | External | Status |
|---------|------|------|----------|----------|--------|
| **backend-saas** | 8000 | FastAPI | No | Yes (Nginx) | ✅ Ready |
| **backend-agents** | 8001 | FastAPI | Yes (Docker network) | No | ✅ Ready |
| **PostgreSQL** | 5432 | DB | Docker network | No | ✅ Ready |
| **Qdrant** | 6333 | Vector DB | Docker network | No | ✅ Ready |
| **Redis** | 6379 | Cache | Docker network | No | ✅ Ready |
| **Ollama** | 11434 | LLM | Docker network | No | ✅ Ready |
| **Nginx** | 80/443 | Reverse Proxy | No | Yes | ✅ Ready |

### Hardware Requirements (Hetzner VPS)

```
Recommended: CX43.8
├─ CPU: 8 vCores (Intel/AMD)
├─ RAM: 16 GB
├─ Storage: 160 GB SSD
├─ Traffic: 20 TB/month
└─ Price: ~€12.49/month

Minimum: CX31
├─ CPU: 2 vCores
├─ RAM: 4 GB
├─ Storage: 40 GB SSD
└─ Price: ~€4.15/month (for testing only)
```

### Network Architecture

```
┌─────────────────────────────────────────────────────┐
│                  INTERNET                           │
│         (Client requests, public DNS)               │
└──────────────────────┬────────────────────────────┘
                       │
                  Port 80 / 443
                       │
        ┌──────────────▼──────────────┐
        │   NGINX (Reverse Proxy)     │
        │  - SSL/TLS termination      │
        │  - Load balancing           │
        │  - CORS headers             │
        │  - Rate limiting            │
        └──────────────┬──────────────┘
                       │
            ┌──────────┴──────────┐
            │                     │
      localhost:8000         localhost:8001
            │                     │
    ┌───────▼────────┐   ┌────────▼───────┐
    │ backend-saas   │   │ backend-agents │
    │ (API Gateway)  │   │ (AI Engine)    │
    └────────┬───────┘   └────────┬───────┘
             │                    │
     ┌───────┴────────────────────┴────────┐
     │      DOCKER NETWORK (internal)      │
     │                                      │
     ├─ PostgreSQL:5432                    │
     ├─ Qdrant:6333                        │
     ├─ Redis:6379                         │
     ├─ Ollama:11434                       │
     └─ /uploads (persistent volume)       │
```

---

## Docker Architecture

### docker-compose.prod.yml Structure

```yaml
version: '3.8'

services:
  # Database Layer
  postgres:
    image: postgres:16-alpine
    container_name: agencia_postgres
    restart: unless-stopped
    healthcheck: enabled
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql

  redis:
    image: redis:7-alpine
    container_name: agencia_redis
    restart: unless-stopped
    healthcheck: enabled
    volumes:
      - redis_data:/data

  qdrant:
    image: qdrant/qdrant:latest
    container_name: agencia_qdrant
    restart: unless-stopped
    volumes:
      - qdrant_data:/qdrant/storage

  # AI/LLM Layer
  ollama:
    image: ollama/ollama:latest
    container_name: agencia_ollama
    restart: unless-stopped
    volumes:
      - ollama_data:/root/.ollama
    healthcheck: enabled
    entrypoint: pull model & start server

  # Application Layer
  backend-saas:
    build: ./backend-saas
    container_name: webshooks_saas
    restart: unless-stopped
    depends_on:
      - postgres
      - redis
    healthcheck: enabled
    env_file: ./backend-saas/.env.production
    volumes:
      - ./uploads:/app/uploads

  backend-agents:
    build: ./backend-agents
    container_name: webshooks_agents
    restart: unless-stopped
    depends_on:
      - postgres
      - qdrant
      - ollama
    healthcheck: enabled
    env_file: ./backend-agents/.env.production
    ports:
      - "8001:8001"  # Internal, but mapped for debugging

  # Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: webshooks_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./scripts/nginx.conf:/etc/nginx/nginx.conf
      - /etc/letsencrypt/:/etc/letsencrypt/
    depends_on:
      - backend-saas

volumes:
  postgres_data:
  redis_data:
  qdrant_data:
  ollama_data:

networks:
  app-network:
    driver: bridge
```

### Volume Mounts

| Container | Mount Point | Volume | Purpose |
|-----------|-------------|--------|---------|
| postgres | /var/lib/postgresql/data | postgres_data | Database persistence |
| redis | /data | redis_data | Cache persistence |
| qdrant | /qdrant/storage | qdrant_data | Vector DB persistence |
| ollama | /root/.ollama | ollama_data | Model cache |
| backend-saas | /app/uploads | ./uploads | File uploads storage |

---

## Deployment Guide

### Phase 1: VPS Preparation

```bash
# 1. SSH into VPS
ssh root@your-vps-ip

# 2. Update system
apt update && apt upgrade -y

# 3. Install Docker & Docker Compose
apt install -y curl docker.io docker-compose-plugin

# 4. Verify installation
docker --version
docker compose version

# 5. Create application directory
mkdir -p /opt/webshooks
cd /opt/webshooks
```

### Phase 2: Code Transfer

```bash
# LOCAL MACHINE: Create tar file (excluding large directories)
tar -czf webshooks-platform.tar.gz \
  --exclude='node_modules' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='.git' \
  --exclude='frontend/.next' \
  --exclude='.pytest_cache' \
  .

# LOCAL: Transfer to VPS
scp webshooks-platform.tar.gz root@your-vps-ip:/tmp/

# VPS: Extract
cd /opt/webshooks
tar -xzf /tmp/webshooks-platform.tar.gz
rm /tmp/webshooks-platform.tar.gz
```

### Phase 3: Environment Configuration

```bash
# Create .env for Docker Compose
cat > /opt/webshooks/.env << 'EOF'
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=YOUR_STRONG_PASSWORD_32_CHARS_MIN
POSTGRES_DB=agencia_web_b2b

# Redis
REDIS_PASSWORD=YOUR_REDIS_PASSWORD_32_CHARS

# Ollama
OLLAMA_MODEL=gemma3:latest

# Domain & TLS
DOMAIN=your-domain.com
ENVIRONMENT=production
EOF

# Edit with real values
nano /opt/webshooks/.env
```

### Phase 4: Build & Deploy

```bash
# Navigate to project
cd /opt/webshooks

# Make scripts executable
chmod +x scripts/*.sh

# Run preflight checks
./scripts/preflight-check.sh

# Build images (takes ~5-10 minutes)
docker compose -f docker-compose.prod.yml build

# Start services (takes ~2-3 minutes for Ollama to pull model)
docker compose -f docker-compose.prod.yml up -d

# Verify services
docker compose ps
docker compose logs -f

# Expected output:
# STATUS: Up, Health: healthy (after ~2 min)
```

### Phase 5: Database Initialization

```bash
# Create admin user
docker compose exec backend-saas python -m app.db.seed

# Verify tables
docker compose exec postgres psql -U postgres -d agencia_web_b2b -c "\dt"

# Expected tables:
# - users
# - tenants
# - traces
# - agent_metrics
# - tenant_config
```

### Phase 6: SSL/TLS Setup

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Create certificate
certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Verify certificate
ls -la /etc/letsencrypt/live/your-domain.com/

# Copy cert paths to nginx.conf:
# ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

# Restart Nginx
docker compose restart nginx
```

### Phase 7: Post-Deployment Verification

```bash
# Test health endpoints
curl -s https://your-domain.com/health | jq

# Test Swagger UI (should return HTML)
curl -s https://your-domain.com/docs | head -20

# Test backend-agents (internal)
docker compose exec backend-agents curl http://localhost:8001/health | jq

# View logs
docker compose logs --tail=50 -f
```

---

## Production Configuration

### Environment Variables

**backend-saas/.env.production**
```bash
# Database
DATABASE_URL=postgresql://postgres:PASSWORD@db:5432/agencia_web_b2b

# CORS
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com

# Internal Services
BACKEND_AGENTS_URL=http://backend-agents:8001
QDRANT_URL=http://qdrant:6333
OLLAMA_URL=http://ollama:11434

# Models
EMBED_MODEL=nomic-embed-text
LLM_MODEL=qwen2.5:0.5b

# Logging
LOG_LEVEL=WARNING
JSON_LOGS=true

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60

# Uploads
UPLOAD_DIR=/app/uploads
MAX_UPLOAD_SIZE_MB=50
```

**backend-agents/.env.production**
```bash
# Database
DATABASE_URL=postgresql://postgres:PASSWORD@db:5432/agencia_web_b2b

# Ollama (Local)
LLM_PROVIDER=ollama
OLLAMA_URL=http://ollama:11434
LLM_MODEL=gemma3:latest
EMBED_MODEL=nomic-embed-text

# OR OpenRouter (Cloud) - Optional
# LLM_PROVIDER=openrouter
# OPENROUTER_API_KEYS=sk-or-v1-xxx,sk-or-v1-yyy
# OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet
# OPENROUTER_STRATEGY=least_used

# Qdrant
QDRANT_URL=http://qdrant:6333

# Redis
REDIS_URL=redis://:PASSWORD@redis:6379/0

# Logging
LOG_LEVEL=WARNING
JSON_LOGS=true

# Rate Limiting
RATE_LIMIT_PER_MINUTE=30

# Security
ALLOW_FALLBACK_TENANT=false
```

### Nginx Configuration (scripts/nginx.conf)

```nginx
upstream backend_saas {
    server backend-saas:8000;
}

server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;

    location / {
        proxy_pass http://backend_saas;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

---

## Monitoring & Health Checks

### Health Endpoints

```bash
# Backend-saas health (external)
curl https://your-domain.com/health

# Response (200 OK):
{
  "status": "healthy",
  "timestamp": "2026-04-02T15:30:00Z",
  "dependencies": {
    "postgresql": "healthy",
    "qdrant": "healthy",
    "ollama": "healthy"
  }
}
```

### Docker Health Checks

```bash
# View health status of all services
docker compose ps

# NAME                    STATUS
# agencia_postgres        Up 2 minutes (healthy)
# agencia_redis           Up 2 minutes (healthy)
# agencia_qdrant          Up 2 minutes (healthy)
# agencia_ollama          Up 2 minutes (healthy)
# webshooks_saas          Up 2 minutes (healthy)
# webshooks_agents        Up 2 minutes (healthy)
# webshooks_nginx         Up 2 minutes

# View logs for specific service
docker compose logs backend-saas --tail=100 -f

# View all logs
docker compose logs --tail=50 -f
```

### Automated Health Monitoring

```bash
# Create cron job for health checks (every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/webshooks/scripts/healthcheck.sh") | crontab -

# Content of scripts/healthcheck.sh:
#!/bin/bash
STATUS=$(curl -s https://your-domain.com/health | jq -r '.status')
if [ "$STATUS" != "healthy" ]; then
  # Send alert (email, Slack, etc)
  curl -X POST https://your-slack-webhook-url \
    -d '{"text":"⚠️ Webshooks health check failed"}'
fi
```

---

## Backup & Recovery

### Automated Daily Backup

```bash
# Create backup script (scripts/backup.sh)
#!/bin/bash
BACKUP_DIR="/backups/webshooks"
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker compose exec -T postgres pg_dump \
  -U postgres agencia_web_b2b \
  | gzip > $BACKUP_DIR/postgres_$(date +%Y%m%d_%H%M%S).sql.gz

# Backup Qdrant
docker compose cp qdrant:/qdrant/storage $BACKUP_DIR/qdrant_$(date +%Y%m%d)

# Keep only last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete

# Upload to S3 (optional)
# aws s3 sync $BACKUP_DIR s3://your-bucket/backups/
```

### Create Cron Backup Job

```bash
# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/webshooks/scripts/backup.sh") | crontab -
```

### Restore from Backup

```bash
# Restore PostgreSQL
docker compose exec -T postgres psql -U postgres agencia_web_b2b < backup.sql

# Restore Qdrant (stop service first)
docker compose stop qdrant
rm -rf qdrant_data/*
docker compose cp backup/qdrant_storage qdrant:/qdrant/storage
docker compose start qdrant
```

---

## Troubleshooting

### Backend-saas not responding

```bash
docker compose logs backend-saas | tail -50
docker compose exec backend-saas curl http://localhost:8000/health
```

### Ollama not downloading model

```bash
docker compose logs ollama
docker compose exec ollama ollama list
docker compose exec ollama ollama pull gemma3:latest
```

### PostgreSQL connection error

```bash
docker compose exec postgres psql -U postgres -c "SELECT 1"
# Check credentials in .env
```

### Qdrant not indexing

```bash
curl http://localhost:6333/health
curl http://localhost:6333/collections
```

### High memory usage

```bash
docker stats
# Reduce OLLAMA_NUM_GPU or model size
```

---

## Useful Production Commands

```bash
# View database size
docker compose exec postgres psql -U postgres -d agencia_web_b2b \
  -c "SELECT pg_size_pretty(pg_database_size('agencia_web_b2b'))"

# List all API keys
docker compose exec postgres psql -U postgres -d agencia_web_b2b \
  -c "SELECT email, api_key FROM users LIMIT 10"

# Delete old traces (older than 30 days)
docker compose exec postgres psql -U postgres -d agencia_web_b2b \
  -c "DELETE FROM traces WHERE created_at < NOW() - INTERVAL '30 days'"

# Restart a service
docker compose restart backend-saas

# View resource usage
docker stats --no-stream

# Clean up old logs
docker system prune -a --volumes
```

---

**Status:** ✅ Production Ready
**Last Updated:** 2026-04-02
**Next Review:** 2026-05-02
