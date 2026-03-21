#!/bin/bash
# ============================================
# SCRIPT: Pre-Deploy Auth Validation
# Uso: ./scripts/pre-deploy-auth-validate.sh
# ============================================

set -e

echo "============================================"
echo "  PRE-DEPLOY AUTH VALIDATION"
echo "============================================"
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

# ============================================
# 1. SECURITY: Check for hardcoded secrets
# ============================================
echo "[1/8] Scanning for hardcoded secrets..."

if grep -r "366bbcdceecb8723e8de206c2e0cc7b5" src/ 2>/dev/null; then
    check_fail "CRITICAL: Hardcoded fallback secret found"
else
    check_pass "No hardcoded fallback secrets"
fi

if grep -rE "password[\"']?\s*[:=]\s*[\"'][^\"']{8,}" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "passwordHash" | grep -v "_password" | grep -v "passwordOptions" | grep -v "test"; then
    check_fail "Potential hardcoded passwords found"
else
    check_pass "No hardcoded passwords"
fi

# ============================================
# 2. AUTH: Verify NextAuth config
# ============================================
echo ""
echo "[2/8] Validating NextAuth configuration..."

if grep -q "allowDangerousEmailAccountLinking: true" src/auth.config.ts 2>/dev/null; then
    check_fail "OAuth allows dangerous email account linking"
else
    check_pass "OAuth dangerous linking disabled"
fi

if grep -q "strategy.*database" src/auth.config.ts 2>/dev/null; then
    check_warn "Using database strategy (JWT recommended for performance)"
else
    check_pass "Using JWT strategy"
fi

# ============================================
# 3. AUTH: Verify credentials provider
# ============================================
echo ""
echo "[3/8] Validating Credentials provider..."

if grep -q "process.env.AUTH_INTERNAL_EMAIL" src/auth.config.ts 2>/dev/null; then
    check_fail "Credentials provider uses ENV-based auth (should use DB)"
else
    check_pass "Credentials provider uses database validation"
fi

if grep -q "PrismaAdapter\|prisma" src/auth.config.ts 2>/dev/null; then
    check_pass "Prisma adapter configured"
else
    check_fail "Prisma adapter not found in auth config"
fi

# ============================================
# 4. SESSION: Verify session security
# ============================================
echo ""
echo "[4/8] Validating session security..."

if grep -q "httpOnly.*true\|httpOnly:true" src/lib/security/cookies.ts 2>/dev/null; then
    check_pass "HttpOnly cookie flag enabled"
else
    check_fail "HttpOnly cookie flag missing"
fi

if grep -q "secure.*isProd\|secure: isProd" src/lib/security/cookies.ts 2>/dev/null; then
    check_pass "Secure cookie flag (production)"
else
    check_warn "Secure cookie flag may not be properly configured"
fi

# ============================================
# 5. API: Verify rate limiting
# ============================================
echo ""
echo "[5/8] Validating rate limiting..."

if grep -q "Ratelimit\|ratelimit" src/proxy.ts 2>/dev/null; then
    check_pass "Rate limiting configured in proxy"
else
    check_fail "Rate limiting not found in proxy"
fi

if grep -q "throw.*production\|throw new Error" src/lib/ratelimit.ts 2>/dev/null; then
    check_pass "Rate limiting fail-closed in production"
else
    check_warn "Rate limiting may fail-open in production"
fi

# ============================================
# 6. DB: Verify schema constraints
# ============================================
echo ""
echo "[6/8] Validating database schema..."

if grep -q "@unique" prisma/schema.prisma 2>/dev/null; then
    check_pass "Unique constraints defined in schema"
else
    check_warn "No unique constraints found in schema"
fi

if grep -q "@relation.*onDelete.*Cascade" prisma/schema.prisma 2>/dev/null; then
    check_pass "Cascade deletes configured"
else
    check_warn "Cascade deletes not found"
fi

# ============================================
# 7. MIDDLEWARE: Verify proxy.ts
# ============================================
echo ""
echo "[7/8] Validating middleware/proxy..."

if [ -f "src/proxy.ts" ]; then
    check_pass "proxy.ts exists (Next.js 16 convention)"

    if grep -q "export default auth\|export.*function proxy" src/proxy.ts 2>/dev/null; then
        check_pass "proxy.ts exports middleware correctly"
    else
        check_fail "proxy.ts may not export middleware correctly"
    fi
else
    check_warn "proxy.ts not found, checking middleware.ts"
    if [ -f "src/middleware.ts" ]; then
        check_pass "middleware.ts exists"
    fi
fi

# ============================================
# 8. ENV: Verify required variables
# ============================================
echo ""
echo "[8/8] Validating environment configuration..."

if [ -f ".env" ]; then
    if grep -q "AUTH_SECRET=" .env 2>/dev/null && ! grep -q "AUTH_SECRET=$" .env 2>/dev/null; then
        check_pass "AUTH_SECRET configured"
    else
        check_fail "AUTH_SECRET not configured"
    fi

    if grep -q "INTERNAL_API_SECRET=" .env 2>/dev/null && ! grep -q "INTERNAL_API_SECRET=$" .env 2>/dev/null; then
        check_pass "INTERNAL_API_SECRET configured"
    else
        check_fail "INTERNAL_API_SECRET not configured"
    fi

    if grep -q "NEXTAUTH_URL=" .env 2>/dev/null && ! grep -q "NEXTAUTH_URL=$" .env 2>/dev/null; then
        check_pass "NEXTAUTH_URL configured"
    else
        check_fail "NEXTAUTH_URL not configured"
    fi

    if grep -q "AUTH_TRUST_HOST=true" .env 2>/dev/null; then
        check_pass "AUTH_TRUST_HOST enabled"
    else
        check_warn "AUTH_TRUST_HOST may not be enabled"
    fi
else
    check_warn ".env file not found (may be using environment variables)"
fi

# ============================================
# SUMMARY
# ============================================
echo ""
echo "============================================"
echo "  VALIDATION SUMMARY"
echo "============================================"
echo ""
echo "✅ Passed:  $PASSED"
echo "❌ Failed:  $FAILED"
echo "⚠️ Warnings: $WARNINGS"
echo ""

if [ $FAILED -gt 0 ]; then
    echo "🚨 DEPLOY BLOCKED: Critical issues found"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo "⚠️ DEPLOY WITH CAUTION: Warnings present"
    exit 0
else
    echo "✅ AUTH VALIDATION PASSED"
    exit 0
fi
