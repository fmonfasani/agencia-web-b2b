#!/bin/bash

# Configuration
VPS_USER="root"
VPS_IP="134.209.41.51"
REMOTE_PATH="/opt/webshooks-scraper"

echo "🚀 Iniciando despliegue de Scraper a la VPS ($VPS_IP)..."

# 1. Crear carpeta remota si no existe
ssh $VPS_USER@$VPS_IP "mkdir -p $REMOTE_PATH"

# 2. Sincronizar archivos
echo "📦 Sincronizando archivos..."
if command -v rsync >/dev/null 2>&1; then
    rsync -avz --exclude 'venv' --exclude '__pycache__' --exclude '.git' ./ $VPS_USER@$VPS_IP:$REMOTE_PATH
else
    echo "⚠️ rsync no encontrado, usando scp (esto puede ser más lento)..."
    scp -r ./* $VPS_USER@$VPS_IP:$REMOTE_PATH
fi

# 3. Levantar con Docker Compose en la VPS
echo "🏗️ Levantando contenedores en la VPS..."
ssh $VPS_USER@$VPS_IP "cd $REMOTE_PATH && docker compose up -d --build"

echo "✅ Despliegue completado."
echo "⚠️ RECUERDA: Debes tener instalado Docker y Docker Compose en tu VPS."
echo "⚠️ RECUERDA: Configura el .env en la VPS con tu DATABASE_URL y Google API Key."
