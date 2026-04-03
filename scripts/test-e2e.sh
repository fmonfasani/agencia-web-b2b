#!/bin/bash
# ========================================
# END-TO-END TEST - Production Readiness
# ========================================
# Uso: ./scripts/test-e2e.sh [base_url] [api_key]
# Ejemplo: ./scripts/test-e2e.sh http://localhost:8000 wh_test_key_12345

set -e

BASE_URL=${1:-"http://localhost:8000"}
API_KEY=${2:-""}

echo "=========================================="
echo "  E2E TEST - Webshooks Platform"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo "API Key: ${API_KEY:-<no provided>}"
echo ""

FAILED=0
PASSED=0

test_endpoint() {
    local method=$1
    local url=$2
    local expected=$3
    local auth=$4
    local data=$5

    echo -n "Testing $method $url ... "

    if [ -n "$auth" ]; then
        AUTH_HEADER="-H 'X-API-Key: $auth'"
    else
        AUTH_HEADER=""
    fi

    if [ -n "$data" ]; then
        RESPONSE=$(curl -s -X $method "$BASE_URL$url" \
            -H "Content-Type: application/json" \
            $AUTH_HEADER \
            -d "$data" \
            -w "\n%{http_code}")
    else
        RESPONSE=$(curl -s -X $method "$BASE_URL$url" \
            $AUTH_HEADER \
            -w "\n%{http_code}")
    fi

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [[ "$HTTP_CODE" == "$expected" ]]; then
        echo "✅ $HTTP_CODE"
        ((PASSED++))
        return 0
    else
        echo "❌ Expected $expected, got $HTTP_CODE"
        echo "   Body: $BODY"
        ((FAILED++))
        return 1
    fi
}

# ============================================
# TESTS
# ============================================

echo "[1/6] Health checks..."
test_endpoint "GET" "/health" "200" "" ""
# backend-agents health (on different port)
AGENTS_URL=$(echo "$BASE_URL" | sed 's/8000/8001/')
echo -n "Testing backend-agents health... "
if curl -s "$AGENTS_URL/health" > /dev/null; then
    echo "✅"
    ((PASSED++))
else
    echo "❌"
    ((FAILED++))
fi

echo ""
echo "[2/6] Auth endpoints (no auth required for register/login)..."

# Register a test user (temporary)
TEST_EMAIL="test_$(date +%s)@example.com"
REGISTER_DATA="{\"email\":\"$TEST_EMAIL\",\"password\":\"TestPass123!\",\"nombre\":\"Test User\",\"rol\":\"cliente\"}"
test_endpoint "POST" "/auth/register" "200" "" "$REGISTER_DATA"

echo ""
echo "[3/6] Login (obtener API Key)..."
LOGIN_DATA="{\"email\":\"$TEST_EMAIL\",\"password\":\"TestPass123!\"}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "$LOGIN_DATA")
API_KEY=$(echo "$LOGIN_RESPONSE" | grep -o '"api_key":"[^"]*"' | cut -d'"' -f4)

if [ -n "$API_KEY" ]; then
    echo "✅ API Key obtenida"
    ((PASSED++))
else
    echo "❌ No se obtuvo API Key"
    ((FAILED++))
    API_KEY="wh_fallback_test_key"  # usar clave fija para tests restantes
fi

echo ""
echo "[4/6] Create tenant (requires analista/admin role)..."
# Como no tenemos admin, skip este test o usamos tenant existente
echo "⚠️  Skipping tenant creation (requires admin role)"

echo ""
echo "[5/6] Check onboarding status (no tenant)..."
# Sin tenant_id no funciona, skip
echo "⚠️  Skipping status check (no tenant created)"

echo ""
echo "[6/6] Agent engine health (using API Key)..."
test_endpoint "GET" "/agent/health" "200" "$API_KEY" "" || {
    # Intento en puerto 8001
    echo -n "Testing agents health directly... "
    if curl -s -H "X-API-Key: $API_KEY" "$AGENTS_URL/health" > /dev/null; then
        echo "✅"
        ((PASSED++))
    else
        echo "❌"
        ((FAILED++))
    fi
}

# ============================================
# SUMMARY
# ============================================
echo ""
echo "=========================================="
echo "  E2E TEST SUMMARY"
echo "=========================================="
echo ""
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
echo ""

if [ $FAILED -gt 0 ]; then
    echo "🚨 SOME TESTS FAILED"
    exit 1
else
    echo "✅ ALL TESTS PASSED"
    exit 0
fi
