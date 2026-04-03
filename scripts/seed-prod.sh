#!/bin/bash
# ========================================
# SEED PRODUCTION - Crear usuario admin inicial
# ========================================
# Uso: ./scripts/seed-prod.sh [admin_email] [admin_password]
# Ejemplo: ./scripts/seed-prod.sh admin@clinica.com MiPassword123!

set -e

ADMIN_EMAIL=${1:-"admin@$(hostname).com"}
ADMIN_PASSWORD=${2:-"$(openssl rand -base64 12 | tr -d '/+=')"}
ADMIN_NAME="Administrador $(hostname)"

echo "=========================================="
echo "  SEED PRODUCTION DATABASE"
echo "=========================================="
echo ""
echo "Creando usuario admin inicial..."
echo "  Email: $ADMIN_EMAIL"
echo "  Password: $ADMIN_PASSWORD"
echo "  Nombre: $ADMIN_NAME"
echo ""
echo "IMPORTANTE: ¡GUARDA ESTA CONTRASEÑA!"
echo ""

# Verificar que .env.production exista y tenga DATABASE_URL
if [ ! -f "backend-saas/.env.production" ]; then
    echo "ERROR: backend-saas/.env.production no encontrado"
    exit 1
fi

# Extraer DATABASE_URL de .env.production
source <(grep -E '^DATABASE_URL=' backend-saas/.env.production | sed 's/^/export /')
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL no definida en .env.production"
    exit 1
fi

# Conectar a PostgreSQL y crear admin
echo "Conectando a PostgreSQL..."

# Usar Python para hashear password correctamente (bcrypt + prehash SHA256)
python3 << 'PYTHON_EOF' > /tmp/create_admin.py
import hashlib
import secrets
from passlib.context import CryptContext

_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
_PREHASH_PREFIX = "sha256$"

def hash_password(password: str) -> str:
    prehashed = hashlib.sha256(password.encode("utf-8")).hexdigest()
    return f"{_PREHASH_PREFIX}{_pwd_ctx.hash(prehashed)}"

import sys
email = sys.argv[1]
password = sys.argv[2]
nombre = sys.argv[3]
user_id = f"c_{secrets.token_hex(10)}"
api_key = f"wh_{secrets.token_urlsafe(32)}"
password_hash = hash_password(password)

print(f"USER_ID={user_id}")
print(f"API_KEY={api_key}")
print(f"PASSWORD_HASH={password_hash}")
PYTHON_EOF

USER_ID=$(python3 /tmp/create_admin.py "$ADMIN_EMAIL" "$ADMIN_PASSWORD" "$ADMIN_NAME" | grep "^USER_ID=" | cut -d= -f2)
API_KEY=$(python3 /tmp/create_admin.py "$ADMIN_EMAIL" "$ADMIN_PASSWORD" "$ADMIN_NAME" | grep "^API_KEY=" | cut -d= -f2)
PASSWORD_HASH=$(python3 /tmp/create_admin.py "$ADMIN_EMAIL" "$ADMIN_PASSWORD" "$ADMIN_NAME" | grep "^PASSWORD_HASH=" | cut -d= -f2)

echo "ID generado: $USER_ID"
echo "API Key: $API_KEY"
echo ""

# Ejecutar SQL para insertar admin
SQL="
INSERT INTO \"User\" (id, email, \"passwordHash\", name, role, \"defaultTenantId\", \"apiKey\", status, \"createdAt\", \"updatedAt\")
VALUES (
    '$USER_ID',
    '$ADMIN_EMAIL',
    '$PASSWORD_HASH',
    '$ADMIN_NAME',
    'ADMIN',
    NULL,
    '$API_KEY',
    'ACTIVE',
    NOW(),
    NOW()
)
ON CONFLICT (email) DO NOTHING
RETURNING id, email, name, role, status;
"

echo "Ejecutando SQL..."
echo "$SQL" | docker exec -i agencia_postgres psql -U postgres -d agencia_web_b2b 2>/dev/null || {
    echo ""
    echo "⚠️  El contenedor PostgreSQL no está corriendo."
    echo "   ¿Quieres ejecutar el SQL manualmente? Copia y pega:"
    echo ""
    echo "$SQL"
    echo ""
    exit 1
}

# Verificar que se creó
VERIFY=$(docker exec -i agencia_postgres psql -U postgres -d agencia_web_b2b -tAc "SELECT id FROM \"User\" WHERE email='$ADMIN_EMAIL' AND status='ACTIVE';" 2>/dev/null | tr -d '[:space:]')
if [ -n "$VERIFY" ]; then
    echo ""
    echo "=========================================="
    echo "✅ ADMIN CREADO EXITOSAMENTE"
    echo "=========================================="
    echo ""
    echo "📧 Email:     $ADMIN_EMAIL"
    echo "🔑 API Key:   $API_KEY"
    echo "👤 Nombre:    $ADMIN_NAME"
    echo "🆔 User ID:   $USER_ID"
    echo ""
    echo "⚠️  GUARDA ESTA INFORMACIÓN - No se volverá a mostrar."
    echo ""
    echo "Para login usa:"
    echo "   POST /auth/login"
    echo "   Body: {\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}"
    echo ""
else
    echo ""
    echo "⚠️  No se pudo verificar la creación del admin."
    echo "   Revisa manualmente la tabla \"User\" en PostgreSQL."
    exit 1
fi
