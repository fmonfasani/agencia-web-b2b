#!/usr/bin/env bash
set -euo pipefail

# Quick QA flow: register -> login (verify fix)
# Configurable via env vars:
# LOCALE: locale path (default: es)
# BASE: base URL (default: http://localhost:3001)
# EMAIL, PASSWORD, COMPANY, WEBSITE, PLAN

LOCALE="${LOCALE:-es}"
BASE="${BASE:-http://localhost:3001}"
EMAIL="${TEST_EMAIL:-qa.user@example.com}"
PASSWORD="${TEST_PASSWORD:-TestPass123!}"
COMPANY="${TEST_COMPANY:-QA Co}"
WEBSITE="${TEST_WEBSITE:-}"
PLAN="${TEST_PLAN:-STARTER}"

REGISTER_URL="$BASE/$LOCALE/api/auth/register-company"
LOGIN_URL="$BASE/$LOCALE/api/auth/login"  # might not be strictly JSON-based; we'll try both paths
CSRF_URL="$BASE/$LOCALE/api/auth/csrf"
CALLBACK_URL="$BASE/$LOCALE/api/auth/callback/credentials"

echo "==== QA AUTH FLOW ===="
echo "Locale: $LOCALE | User: $EMAIL | Plan: $PLAN"

### Step 1: Register new user
echo "[1/3] Registering user..."
REG_BODY=$(cat <<JSON
{
  "firstName": "QA",
  "lastName": "User",
  "email": "$EMAIL",
  "companyName": "$COMPANY",
  "website": "$WEBSITE",
  "plan": "$PLAN",
  "password": "$PASSWORD"
}
JSON
)
http_code=$(curl -s -o /tmp/register_body.json -w "%{http_code}" -X POST "$REGISTER_URL" \
  -H "Content-Type: application/json" \
  -d "$REG_BODY")
echo "Status: $http_code"
cat /tmp/register_body.json | sed 's/\n/ /g'

if [ "$http_code" -ne 201 ]; then
  echo "Register did not return 201. Aborting." 
  exit 2
fi

### Step 2: Attempt login (JSON path)
echo "[2/3] Trying login via JSON path..."
http_code_login=$(curl -s -o /tmp/login_json_body.json -w "%{http_code}" -X POST "$LOGIN_URL" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
echo "Login JSON status: $http_code_login"
if [ "$http_code_login" -eq 200 ]; then
  echo "Login via JSON path might have succeeded (or redirected)." 
  cat /tmp/login_json_body.json | sed 's/\n/ /g'
 else
  echo "Login via JSON path not a definitive indicator (status $http_code_login). Will try form/callback path next." 
fi

### Step 3: Optional: try credentials callback path (requires CSRF)
echo "[3/3] Attempting login via credentials callback path (form data) if CSRF available..."
csrf_token=""
if curl --silent -c /tmp/qa_cookies.txt "$CSRF_URL" >/dev/null 2>&1; then
  if grep -q next-auth.csrf-token /tmp/qa_cookies.txt; then
    csrf_token=$(grep next-auth.csrf-token /tmp/qa_cookies.txt | awk '{print $7}')
  fi
fi
if [ -z "$csrf_token" ]; then
  # Fallback: try to extract from a short body fetch
  body=$(curl -s "$CSRF_URL" -H "Content-Type: application/json")
  csrf_token=$(echo "$body" | grep -o 'csrfToken":"[^"/]*' | head -n1 | sed 's/.*csrfToken":"\([^"]*\).*/\1/')
fi
if [ -n "$csrf_token" ]; then
  echo "CSRF token acquired: [REDACTED]"
  login_form_body="csrfToken=$csrf_token&email=$EMAIL&password=$PASSWORD"
  http_code_cb=$(curl -s -L -o /tmp/login_cb.json -w "%{http_code}" -b /tmp/qa_cookies.txt -c /tmp/qa_cookies.txt -X POST -H "Content-Type: application/x-www-form-urlencoded" --data "$login_form_body" "$CALLBACK_URL")
  echo "Credentials callback status: $http_code_cb"
  if [ "$http_code_cb" -eq 200 ] || [ "$http_code_cb" -eq 302 ]; then
    echo "Login via callback path succeeded (cookie should be set)."
  else
    echo "Login via callback path did not succeed. (status $http_code_cb)"
  fi
else
  echo "CSRF token not found; skipping credentials callback path."
fi

echo "==== DONE ===="
