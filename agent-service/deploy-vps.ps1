$VPS_USER = "root"
$VPS_IP = "134.209.41.51"
$REMOTE_PATH = "/opt/agencia-b2b-scraper"

Write-Host "--- Iniciando despliegue de Scraper a la VPS ($VPS_IP) ---"

# 1. Crear carpeta remota
Write-Host "1. Creando carpeta remota..."
ssh $VPS_USER@$VPS_IP "mkdir -p $REMOTE_PATH"

# 2. Sincronizar archivos usando scp
Write-Host "2. Sincronizando archivos... (esto puede tardar un poco)"
scp -r ./* ${VPS_USER}@${VPS_IP}:${REMOTE_PATH}

# 3. Levantar con Docker Compose en la VPS
Write-Host "3. Levantando contenedores en la VPS..."
ssh $VPS_USER@$VPS_IP "cd $REMOTE_PATH && docker compose up -d --build"

Write-Host "DONE: Despliegue completado."
Write-Host "RECUERDA: Configura el .env en la VPS con: nano /opt/agencia-b2b-scraper/.env"
