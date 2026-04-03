#!/bin/bash
# ========================================
# PRE-DEPLOY VALIDATION - Backend Services
# ========================================
# Verifica que todo esté listo para deployment en VPS
# Uso: ./scripts/preflight-check.sh

set -e

echo "=========================================="
echo "  PRE-DEPLOY VALIDATION"
echo "=========================================="
echo ""

PASSED=0
FAILED=0
WARNINGS=0

check_pass() {
    echo "✅ $1"
    ((PASSED++))
}

check_fail() {
    echo "❌ $1"
    ((FAILED++))
}

check_warn() {
    echo "⚠️ $1"
    ((WARNINGS++))
}

# 1. Docker availability
echo "[1/10] Verificando Docker..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d',' -f1)
    check_pass "Docker instalado ($DOCKER_VERSION)"
else
    check_fail "Docker no está instalado"
fi

# 2. Docker Compose
echo ""
echo "[2/10] Verificando Docker Compose..."
if docker compose version &> /dev/null; then
    COMPOSE_VERSION=$(docker compose version)
    check_pass "Docker Compose disponible ($COMPOSE_VERSION)"
else
    check_fail "Docker Compose no disponible"
fi

# 3. Required files exist
echo ""
echo "[3/10] Verificando archivos de configuración..."

REQUIRED_FILES=(
    "docker-compose.prod.yml"
    "backend-saas/Dockerfile"
    "backend-agents/Dockerfile"
    "backend-saas/.env.production"
    "backend-agents/.env.production"
    "scripts/healthcheck.sh"
    "scripts/backup.sh"
    "DEPLOYMENT.md"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "$file existe"
    else
        check_fail "$file NO encontrado"
    fi
done

# 4. Environment variables configured
echo ""
echo "[4/10] Verificando variables de entorno críticas..."

CRITICAL_VARS=(
    "DATABASE_URL"
    "ALLOWED_ORIGINS"
    "QDRANT_URL"
    "OLLAMA_BASE_URL"
)

for var in "${CRITICAL_VARS[@]}"; do
    if grep -q "^${var}=" backend-saas/.env.production 2>/dev/null && \
       grep -q "^${var}=" backend-agents/.env.production 2>/dev/null; then
        check_pass "$var configurada en ambos .env.production"
    else
        check_warn "$var no configurada en algún .env.production"
    fi
done

# 5. Check for placeholder passwords
echo ""
echo "[5/10] Verificando que NO haya passwords por defecto..."

if grep -q "cambiar_password\|password\|TU_PASSWORD" backend-saas/.env.production 2>/dev/null; then
    check_fail "Passwords por defecto en backend-saas/.env.production"
else
    check_pass "Backend-saas: passwords configurados"
fi

if grep -q "cambiar_password\|password\|TU_PASSWORD" backend-agents/.env.production 2>/dev/null; then
    check_fail "Passwords por defecto en backend-agents/.env.production"
else
    check_pass "Backend-agents: passwords configurados"
fi

# 6. Docker images can build
echo ""
echo "[6/10] Verificando que las imágenes Docker pueden construirse..."

echo "   Probando backend-saas..."
if docker build -q backend-saas > /dev/null 2>&1; then
    check_pass "backend-saas Docker build OK"
else
    check_fail "backend-saas Docker build falló"
fi

echo "   Probando backend-agents..."
if docker build -q backend-agents > /dev/null 2>&1; then
    check_pass "backend-agents Docker build OK"
else
    check_fail "backend-agents Docker build falló"
fi

# 7. Check Python dependencies
echo ""
echo "[7/10] Verificando dependencias Python..."

if [ -f "backend-saas/requirements.txt" ]; then
    check_pass "backend-saas/requirements.txt existe"
else
    check_fail "backend-saas/requirements.txt NO encontrado"
fi

if [ -f "backend-agents/requirements.txt" ]; then
    check_pass "backend-agents/requirements.txt existe"
else
    check_fail "backend-agents/requirements.txt NO encontrado"
fi

# 8. Check for relative imports (no from .app import)
echo ""
echo "[8/10] Verificando imports correctos (from app.*)..."
BAD_IMPORTS=$(grep -rE "^from \.\.?app\.|^import \.\.?app\." backend-saas/app backend-agents/app 2>/dev/null | wc -l)
if [ "$BAD_IMPORTS" -eq 0 ]; then
    check_pass "No hay imports relativos incorrectos"
else
    check_fail "Encontrados $BAD_IMPORTS imports relativos incorrectos"
fi

# 9. Check type hints (quick scan)
echo ""
echo "[9/10] Verificando type hints en funciones principales..."
MISSING_HINTS=$(grep -r "def [a-zA-Z_]*(" backend-saas/app/*.py backend-agents/app/*.py 2>/dev/null | grep -v "-> " | wc -l)
if [ "$MISSING_HINTS" -lt 10 ]; then
    check_pass "Funciones con type hints aceptables ($MISSING_HINTS sin hint)"
else
    check_warn "Posibles funciones sin type hints ($MISSING_HINTS)"
fi

# 10. Port availability
echo ""
echo "[10/10] Verificando puertos disponibles (localhost)..."
PORTS_IN_USE=$(netstat -tuln 2>/dev/null | grep -E ":(8000|8001|5432|6333|6379|11434)" | wc -l)
if [ "$PORTS_IN_USE" -eq 0 ]; then
    check_pass "Todos los puertos disponibles localmente"
else
    check_warn "Algunos puertos ya están en uso (pueden estar ocupados por otros servicios)"
fi

# ============================================
# SUMMARY
# ============================================
echo ""
echo "=========================================="
echo "  VALIDATION SUMMARY"
echo "=========================================="
echo ""
echo "✅ Passed:  $PASSED"
echo "❌ Failed:  $FAILED"
echo "⚠️ Warnings: $WARNINGS"
echo ""

if [ $FAILED -gt 0 ]; then
    echo "🚨 DEPLOYMENT BLOCKED: Critical issues found"
    echo "   Fix the failures above before deploying."
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo "⚠️ DEPLOY WITH CAUTION: Warnings present"
    echo "   Review warnings above."
    exit 0
else
    echo "✅ ALL CHECKS PASSED - Ready to deploy!"
    exit 0
fi
