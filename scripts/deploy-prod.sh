#!/bin/bash
# ========================================
# DEPLOY TO PRODUCTION - Hetzner VPS
# ========================================
# Uso: ./scripts/deploy-prod.sh [vps_ip] [ssh_user]
# Ejemplo: ./scripts/deploy-prod.sh 123.123.123.123 root

set -e

VPS_IP=${1:-"TU_VPS_IP"}
SSH_USER=${2:-"root"}
DEPLOY_DIR="/opt/webshooks"
ENV_FILE=".env.production"

echo "=========================================="
echo "  DEPLOY TO HETZNER"
echo "=========================================="
echo "Target: $SSH_USER@$VPS_IP"
echo "Deploy dir: $DEPLOY_DIR"
echo ""

# 1. Verificar que existan archivos necesarios
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "ERROR: docker-compose.prod.yml no encontrado"
    exit 1
fi

if [ ! -f "backend-saas/.env.production" ]; then
    echo "ERROR: backend-saas/.env.production no encontrado"
    exit 1
fi

if [ ! -f "backend-agents/.env.production" ]; then
    echo "ERROR: backend-agents/.env.production no encontrado"
    exit 1
fi

# 2. Construir y taggear imágenes
echo "[1/6] Construyendo imágenes Docker..."
docker compose -f docker-compose.prod.yml build

# 3. Guardar imágenes en tar (opcional - para subir manualmente)
#docker save -o webshooks-images.tar backend-saas backend-agents

# 4. Copiar archivos al VPS
echo "[2/6] Copiando archivos al VPS..."
scp docker-compose.prod.yml "$SSH_USER@$VPS_IP:$DEPLOY_DIR/docker-compose.yml"
scp backend-saas/.env.production "$SSH_USER@$VPS_IP:$DEPLOY_DIR/backend-saas/.env"
scp backend-agents/.env.production "$SSH_USER@$VPS_IP:$DEPLOY_DIR/backend-agents/.env"
scp -r scripts "$SSH_USER@$VPS_IP:$DEPLOY_DIR/"

# 5. Ejecutar en VPS
echo "[3/6] Ejecutando deployment en VPS..."
ssh "$SSH_USER@$VPS_IP" "
    cd $DEPLOY_DIR

    echo '  3.1 Deteniendo contenedores antiguos...'
    docker compose down || true

    echo '  3.2 Limpiando imágenes huérfanas...'
    docker image prune -f

    echo '  3.3 Iniciando nuevos contenedores...'
    docker compose up -d --remove-orphans

    echo '  3.4 Esperando-health (60s)...'
    sleep 60
"

# 6. Verificar health
echo "[4/6] Verificando health..."
ssh "$SSH_USER@$VPS_IP" "
    cd $DEPLOY_DIR
    chmod +x scripts/healthcheck.sh
    scripts/healthcheck.sh || exit 1
"

# 7. Mostrar logs iniciales
echo "[5/6] Logs de contenedores (primeras 50 líneas)..."
ssh "$SSH_USER@$VPS_IP" "
    cd $DEPLOY_DIR
    echo '--- backend-saas ---'
    docker compose logs --tail=50 backend-saas || true
    echo ''
    echo '--- backend-agents ---'
    docker compose logs --tail=50 backend-agents || true
"

# 8. Completado
echo ""
echo "=========================================="
echo "✅ DEPLOY COMPLETADO"
echo "=========================================="
echo ""
echo "URLs locales (en VPS):"
echo "  SaaS API:     http://$VPS_IP:8000"
echo "  Agents API:   http://$VPS_IP:8001"
echo "  Qdrant:       http://$VPS_IP:6333"
echo "  PostgreSQL:   localhost:$POSTGRES_PORT (solo interno)"
echo ""
echo "Para exponer al público, configurar Nginx/Caddy con SSL."
echo ""
echo "Comandos útiles:"
echo "  ssh $SSH_USER@$VPS_IP 'cd $DEPLOY_DIR && docker compose logs -f'"
echo "  ssh $SSH_USER@$VPS_IP 'cd $DEPLOY_DIR && docker compose down'"
echo "  ssh $SSH_USER@$VPS_IP 'cd $DEPLOY_DIR && docker compose up -d'"
echo ""
