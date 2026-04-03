#!/bin/bash
# ========================================
# VPS SETUP SCRIPT - Initial Server Preparation
# ========================================
# Ejecutar COMO ROOT en la VPS nueva
# Uso: curl -sSL https://tu-repo/raw/setup-vps.sh | bash

set -e

echo "=========================================="
echo "  VPS SETUP - Webshooks Platform"
echo "=========================================="
echo ""

# Verificar que sea root
if [ "$EUID" -ne 0 ]; then
   echo "ERROR: Este script debe ejecutarse como root"
   exit 1
fi

# 1. Actualizar sistema
echo "[1/8] Actualizando sistema..."
apt-get update && apt-get upgrade -y
check_pass() { echo "✅ $1"; }
check_fail() { echo "❌ $1"; exit 1; }

# 2. Instalar Docker
echo ""
echo "[2/8] Instalando Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    check_pass "Docker instalado"
else
    check_pass "Docker ya instalado"
fi

# 3. Instalar Docker Compose
echo ""
echo "[3/8] Instalando Docker Compose..."
if ! docker compose version &> /dev/null; then
    apt-get install -y docker-compose-plugin
    check_pass "Docker Compose plugin instalado"
else
    check_pass "Docker Compose ya instalado"
fi

# 4. Instalar Nginx
echo ""
echo "[4/8] Instalando Nginx..."
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
    systemctl enable nginx
    systemctl start nginx
    check_pass "Nginx instalado"
else
    check_pass "Nginx ya instalado"
fi

# 5. Instalar Certbot (SSL)
echo ""
echo "[5/8] Instalando Certbot (Let's Encrypt)..."
if ! command -v certbot &> /dev/null; then
    apt-get install -y certbot python3-certbot-nginx
    check_pass "Certbot instalado"
else
    check_pass "Certbot ya instalado"
fi

# 6. Configurar firewall (UFW)
echo ""
echo "[6/8] Configurando firewall (UFW)..."
if command -v ufw &> /dev/null; then
    ufw --force enable
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow http
    ufw allow https
    echo "   ⚠️  IMPORTANTE: Si usas un puerto SSH diferente al 22, configúralo antes de este script"
    ufw status verbose
    check_pass "Firewall configurado"
else
    check_warn "UFW no disponible (i de ser venir con Ubuntu/Debian)"
fi

# 7. Crear directorio de部署
echo ""
echo "[7/8] Creando directorio /opt/webshooks..."
mkdir -p /opt/webshooks
chown -R $(whoami):$(whoami) /opt/webshooks
check_pass "Directorio creado en /opt/webshooks"

# 8. Crear usuario de backup
echo ""
echo "[8/8] Creando usuario 'backup'..."
if ! id "backup" &>/dev/null; then
    useradd -r -m -d /home/backup -s /bin/bash backup
    echo "backup ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/systemctl" >> /etc/sudoers.d/backup
    check_pass "Usuario backup creado"
else
    check_pass "Usuario backup ya existe"
fi

# 9. Configurar logrotate para Docker
echo ""
echo "[9/8] Configurando logrotate..."
cat > /etc/logrotate.d/webshooks << 'LOGROTATE'
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    missingok
    notifempty
    copytruncate
    create 640 root root
}
LOGROTATE
check_pass "Logrotate configurado"

# 10. Crear estructura de backups
echo ""
echo "[10/8] Creando directorio de backups..."
mkdir -p /opt/backups/webshooks
chmod 700 /opt/backups/webshooks
check_pass "Backup dir listo en /opt/backups/webshooks"

# Finalizar
echo ""
echo "=========================================="
echo "✅ VPS SETUP COMPLETADO"
echo "=========================================="
echo ""
echo "Próximos pasos:"
echo "1. Copiar archivos del proyecto a /opt/webshooks"
echo "2. Configurar .env.production con passwords seguros"
echo "3. Ejecutar: cd /opt/webshooks && ./scripts/deploy-prod.sh"
echo ""
echo "Recomendado: Configurar fail2ban"
echo "  apt-get install fail2ban"
echo "  systemctl enable fail2ban"
echo ""
