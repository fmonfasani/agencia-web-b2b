#!/bin/bash
# ========================================
# HEALTHCHECK SCRIPT - Para usar en Docker HEALTHCHECK o cron
# ========================================

set -e

# Configuración (sobrescribir con variables de entorno)
SAAS_URL=${SAAS_URL:-http://localhost:8000}
AGENTS_URL=${AGENTS_URL:-http://localhost:8001}
POSTGRES_HOST=${POSTGRES_HOST:-localhost}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
QDRANT_URL=${QDRANT_URL:-http://localhost:6333}
REDIS_HOST=${REDIS_HOST:-localhost}
REDIS_PORT=${REDIS_PORT:-6379}

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Chequeo de servicios
check_service() {
    local name=$1
    local url=$2
    local expected_status=$3

    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "^${expected_status}$"; then
        log_info "$name está saludable ✓"
        return 0
    else
        log_error "$name no responde correctamente (URL: $url)"
        return 1
    fi
}

check_postgres() {
    if PGPASSWORD="${POSTGRES_PASSWORD:-}" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U postgres -d agencia_web_b2b -c "SELECT 1" > /dev/null 2>&1; then
        log_info "PostgreSQL está saludable ✓"
        return 0
    else
        log_error "PostgreSQL no responde (host: $POSTGRES_HOST:$POSTGRES_PORT)"
        return 1
    fi
}

check_qdrant() {
    if curl -s "$QDRANT_URL/collections" | grep -q '"status"'; then
        log_info "Qdrant está saludable ✓"
        return 0
    else
        log_error "Qdrant no responde (URL: $QDRANT_URL)"
        return 1
    fi
}

check_redis() {
    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping 2>/dev/null | grep -q "PONG"; then
        log_info "Redis está saludable ✓"
        return 0
    else
        log_error "Redis no responde (host: $REDIS_HOST:$REDIS_PORT)"
        return 1
    fi
}

check_ollama() {
    local ollama_url=${OLLAMA_URL:-http://localhost:11434}
    if curl -s "$ollama_url/api/version" > /dev/null 2>&1; then
        log_info "Ollama está saludable ✓"
        return 0
    else
        log_warn "Ollama no responde (URL: $ollama_url)"
        return 1
    fi
}

# Main
echo "=========================================="
echo "  HEALTH CHECK - Webshooks Platform"
echo "=========================================="
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

failed=0

# Checks
check_service "Backend SaaS" "$SAAS_URL/health" "200" || failed=$((failed+1))
check_service "Backend Agents" "$AGENTS_URL/health" "200" || failed=$((failed+1))
check_postgres || failed=$((failed+1))
check_qdrant || failed=$((failed+1))
check_redis || failed=$((failed+1))
check_ollama || failed=$((failed+1))

echo ""
echo "=========================================="
if [ $failed -eq 0 ]; then
    log_info "Todos los servicios operacionales ✓"
    exit 0
else
    log_error "$failed servicio(s) fallando"
    exit 1
fi
