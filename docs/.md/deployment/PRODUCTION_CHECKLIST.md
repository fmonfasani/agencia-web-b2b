# Backend-SaaS Production Readiness Checklist

**Last Updated:** 2026-04-02
**Version:** 1.0.0
**Target Deployment:** VPS (PostgreSQL, Docker Compose)

---

## ✅ Code Quality

### Type Hints
- [ ] All functions have type hints for parameters and return values
  - Check: `grep -r "def " app/ | grep -v " -> " | wc -l` should be ~0
  - Files to verify: `auth_service.py`, `onboarding_service.py`, `auth_router.py`, `onboarding_router.py`
- [ ] Pydantic models use `Field()` with constraints where applicable
  - Check: `app/auth_models.py`, `app/onboarding_models.py`
  - Look for: `Field(..., min_length=1)`, `Field(..., pattern="...")`, `Field(..., ge=0)`
- [ ] Async functions properly typed with `Coroutine` where needed

### Exception Handling
- [ ] Custom exception classes defined in `app/lib/exceptions.py`
  - Verify: `WebshooksException`, `InvalidCredentialsError`, `UserNotFoundError`, `UserInactiveError`, `DuplicateEmailError`, `TenantNotFoundError`, `InvalidTenantIdError`, `UnauthorizedTenantAccessError`, `FileUploadError`, `OnboardingIncompleteError`
- [ ] All exceptions include HTTP status code
- [ ] No bare `except Exception` statements
  - Command: `grep -r "except Exception" app/` should return 0
- [ ] All database errors caught and logged with context
- [ ] All network errors caught with proper HTTP response

### Logging
- [ ] Structured JSON logging enabled via `app/lib/logging_utils.py`
  - Verify: `setup_structured_logging()` called in `main.py`
- [ ] No `print()` statements in production code
  - Command: `grep -r "print(" app/ --include="*.py"` should return 0
- [ ] All important operations logged with `logger.info()`, `logger.error()`, `logger.warning()`
- [ ] Trace ID tracked via `trace_id_var` context variable
- [ ] Sensitive data scrubbed from logs
  - Verify: `SENSITIVE_PATTERNS` in `logging_utils.py` includes passwords, tokens, emails

### Secrets & Configuration
- [ ] No hardcoded secrets in code
  - Command: `grep -r "password=" app/ | grep -v "os.getenv"` should return 0
  - Check: `DATABASE_URL`, `GROQ_API_KEY`, `API_KEY_SECRET` all use `os.getenv()`
- [ ] `.env.example` provided with all required variables
  - Verify: `/backend-saas/.env.example` exists and is up-to-date
- [ ] `.env` and `.env.production` in `.gitignore` (not committed)
- [ ] All environment variables documented in `.env.example`

### Code Organization
- [ ] No relative imports (all imports use `from app.*`)
  - Command: `grep -r "from \." app/` should return 0
- [ ] Single responsibility principle: 1 function = 1 responsibility
- [ ] Database operations async/await (no blocking calls)
  - Files: `auth_service.py`, `onboarding_service.py`
- [ ] No dead code or deprecated functions

---

## ✅ API Documentation

### Swagger/OpenAPI
- [ ] Swagger UI functional at `/docs`
  - Test: Open `http://localhost:8000/docs` in browser
  - Verify: All endpoints listed and interactive
- [ ] ReDoc available at `/redoc`
  - Test: Open `http://localhost:8000/redoc` in browser
- [ ] FastAPI description includes:
  - Overview of the service
  - Authentication flow (API Key in header)
  - Onboarding flow (4 steps)
  - Role descriptions (cliente, analista, admin, superadmin)
  - Rate limiting info
  - Header requirements

### Endpoint Documentation
- [ ] All endpoints have `summary` and `description` in decorators
- [ ] Request body models documented with examples
- [ ] Response models have descriptions
- [ ] Error responses documented with status codes
  - Common: 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 409 (Conflict), 500 (Server Error)
- [ ] Required headers documented
  - `X-API-Key` (required): API key from login
  - `X-Trace-Id` (optional): Distributed tracing ID

### API Documentation File
- [ ] `API_DOCS.md` exists at `/backend-saas/API_DOCS.md`
- [ ] Contains curl/Python examples for all endpoints
- [ ] Documents onboarding flow with step-by-step guide
- [ ] Shows response formats with real examples
- [ ] Lists all error codes with descriptions
- [ ] Includes authentication examples

---

## ✅ Authentication & Security

### API Key Management
- [ ] API keys generated with format `wh_` prefix
  - Check: `auth_service.py` uses `secrets.token_urlsafe()`
- [ ] API key stored as SHA256 hash in database
- [ ] API key validation via header `X-API-Key`
  - Verify: `auth_router.py` has `require_api_key()` dependency
- [ ] API key validation works across backends (SaaS + Agents via shared DB)
  - Files: `app/auth_service.py` uses `get_user_by_api_key()`

### Password Security
- [ ] Passwords hashed using bcrypt with SHA256 pre-hash
  - Verify: `hash_password()` in `auth_service.py` uses `sha256 + bcrypt`
  - Min length enforced in models: `password_hash` model
- [ ] Password verification supports legacy scrypt format from frontend
  - Check: `verify_password()` handles both formats
- [ ] No plaintext passwords stored or logged

### Role-Based Access Control (RBAC)
- [ ] Role enum enforced: `cliente`, `analista`, `admin`, `superadmin`
  - File: `app/auth_models.py` or `app/db/models.py`
- [ ] Role-based route protection via `Depends()`:
  - `require_admin()` for admin operations
  - `require_analista_or_admin()` for management operations
  - `require_client()` for client operations
- [ ] Endpoint protection verified:
  - `GET /auth/users` → admin only
  - `POST /auth/activate` → admin only
  - `POST /onboarding/tenant` → analista/admin
  - `POST /auth/login` → public (any registered user)

### Tenant Isolation
- [ ] Multitenant isolation enforced at API level
  - Verify: `UnauthorizedTenantAccessError` raised when user accesses wrong tenant
- [ ] Cliente users can only access their assigned `tenant_id`
  - Check: `auth_router.py` validates `tenant_id` in request vs user's `tenant_id`
- [ ] Analista/admin users can access all tenants
- [ ] Database queries include `WHERE tenant_id = ?` constraint
- [ ] File uploads scoped to tenant directory: `/uploads/{tenant_id}/`

### User Status Management
- [ ] New users created as **inactive** by default
  - Check: `is_active=False` on user creation
- [ ] Inactive users prevented from login
  - Verify: `UserInactiveError` raised before issuing API key
- [ ] Only admins can activate users via `POST /auth/activate`
- [ ] Admins can deactivate users via `DELETE /auth/users/{user_id}` or similar

### Multitenant Tests
- [ ] Test suite covers multitenant isolation: `tests/test_multitenant_isolation.py`
- [ ] Tests verify:
  - User A cannot access User B's tenant data
  - Analista can manage all tenants
  - Client users blocked from wrong tenant
- [ ] Run tests: `pytest tests/test_multitenant_isolation.py -v`

---

## ✅ Database

### PostgreSQL Setup
- [ ] PostgreSQL server running and accessible
  - Test: `psql -U postgres -d agencia_web_b2b -c "SELECT 1;"` returns 1
- [ ] Database schema created (via Prisma migrations)
  - Run: `prisma migrate deploy` (if using Prisma)
  - Or: Manual SQL scripts in `/migrations/` directory
- [ ] Connection string in `DATABASE_URL` environment variable
  - Format: `postgresql://user:password@host:port/database`
  - No secrets hardcoded in code

### Schema & Indexes
- [ ] Users table exists with columns:
  - `id`, `email`, `password_hash`, `is_active`, `role`, `tenant_id`, `created_at`, `updated_at`
- [ ] Tenants table exists with columns:
  - `id`, `tenant_id`, `tenant_nombre`, `created_by`, `industria`, `ubicacion`, `descripcion_corta`, `created_at`, `updated_at`, plus full onboarding form JSON
- [ ] Indexes created on frequently queried columns:
  - `users.email` (unique)
  - `users.tenant_id`
  - `tenants.tenant_id` (unique)
  - `traces.tenant_id` (if tracing enabled)
- [ ] Foreign key constraints enforced where applicable

### Transaction Handling
- [ ] Critical operations wrapped in try/except/finally
  - User creation, tenant creation, file uploads
- [ ] Database connections properly closed (async context managers)
- [ ] Connection pooling configured (asyncpg for async operations)
- [ ] Rollback on error prevents partial updates

### Error Handling
- [ ] Database errors caught and logged
  - Not exposed to user (no SQL details in response)
- [ ] Common errors handled:
  - Duplicate email: `DuplicateEmailError`
  - Unique constraint violations: caught gracefully
  - Connection timeout: retry logic or user-friendly message

---

## ✅ Error Handling

### Custom Exceptions
- [ ] All exceptions inherit from `WebshooksException` base class
- [ ] Each exception includes:
  - Human-readable message
  - HTTP status code (400, 401, 403, 404, 409, 500)
  - Context data (email, tenant_id, etc.)

### Error Responses
- [ ] Error responses follow consistent format:
  ```json
  {
    "error": "exception_class_name",
    "message": "Human-readable error message",
    "status_code": 400,
    "trace_id": "uuid-here"
  }
  ```
- [ ] HTTP status codes correct:
  - 400: Bad Request (validation, invalid input)
  - 401: Unauthorized (missing/invalid API key)
  - 403: Forbidden (insufficient role, wrong tenant)
  - 404: Not Found (user, tenant, resource)
  - 409: Conflict (duplicate email, tenant exists)
  - 500: Internal Server Error (unhandled exceptions, DB errors)

### Validation Errors
- [ ] Pydantic validation errors return 422 (Unprocessable Entity)
- [ ] Field validation includes:
  - Email format: `EmailStr` from email-validator
  - Required fields enforced via model definition
  - String length constraints: `min_length`, `max_length`
  - Pattern validation: `regex` for alphanumeric IDs

---

## ✅ Testing

### Test Coverage
- [ ] Unit tests for auth flow: `tests/test_auth_complete.py`
- [ ] Integration tests for onboarding: `tests/test_onboarding_complete.py`
- [ ] Multitenant isolation tests: `tests/test_multitenant_isolation.py`
- [ ] Permission/RBAC tests: verify role-based access
- [ ] Error case tests: test all exception scenarios

### Running Tests
- [ ] All tests pass locally
  ```bash
  cd backend-saas
  pytest tests/ -v
  ```
- [ ] Critical tests before deployment:
  - `pytest tests/test_auth_complete.py -v`
  - `pytest tests/test_onboarding_complete.py -v`
  - `pytest tests/test_multitenant_isolation.py -v`
- [ ] Test coverage > 70% (optional but recommended)

### Test Database
- [ ] Test database configured separately from production
  - Use `DATABASE_URL` from `.env.test.local`
- [ ] Test fixtures clean up data after each test
  - Check: `conftest.py` has cleanup logic
- [ ] Tests don't interfere with each other (isolation)

---

## ✅ Observability

### Request Tracing
- [ ] Trace ID generated for every request or passed via `X-Trace-Id` header
  - Check: `main.py` middleware extracts or generates trace ID
- [ ] Trace ID passed to all downstream calls
  - Backend-agents: Forward `X-Trace-Id` header
  - Database: Include in query logs
  - Logging: Included in JSON logs via `trace_id_var`

### Performance Metrics
- [ ] Response time tracked and included in response headers
  - Header: `X-Process-Time: 0.123` (seconds)
  - Check: `main.py` middleware measures `time.time()` before/after
- [ ] Slow query logging enabled (queries > 1 second logged)
- [ ] Large response warnings in logs

### Health Check Endpoint
- [ ] `GET /health` endpoint functional
  - Returns 200 with status if all dependencies healthy
  - Checks: PostgreSQL connection, basic connectivity
  - Response format:
    ```json
    {
      "status": "healthy",
      "timestamp": "2026-04-02T12:34:56Z",
      "version": "1.0.0",
      "dependencies": {
        "database": "healthy",
        "backend_agents": "healthy"
      }
    }
    ```
- [ ] Health check fast (< 1 second)

### Dependency Monitoring
- [ ] Backend-agents connectivity checked (if calling it)
  - Verify: `health_check.py` or similar probes backend-agents
- [ ] PostgreSQL connectivity status reported
- [ ] Redis connectivity status (if using Redis)

### Logging Levels
- [ ] INFO level logs for important events
  - User login, tenant creation, file uploads
- [ ] WARNING level for potential issues
  - Slow queries, auth retries, validation failures
- [ ] ERROR level for exceptions
  - DB errors, API errors, unexpected failures
- [ ] DEBUG level disabled in production (too verbose)

---

## ✅ Configuration

### Environment Variables
- [ ] `.env.example` provided with all required variables:
  ```
  DATABASE_URL=postgresql://...
  GROQ_API_KEY=...
  ENVIRONMENT=production
  LOG_LEVEL=INFO
  ALLOWED_ORIGINS=https://yourdomain.com
  BACKEND_AGENTS_URL=http://backend-agents:8001
  ```
- [ ] All secrets in environment variables (not code)
- [ ] Sensible defaults for development in code
- [ ] Production values in `.env.production` (not committed)

### CORS Configuration
- [ ] CORS origins configurable via `ALLOWED_ORIGINS` environment variable
  - Parse as comma-separated list
  - Example: `ALLOWED_ORIGINS=https://app.webshooks.com,https://admin.webshooks.com`
- [ ] Credentials allowed: `allow_credentials=True`
- [ ] Methods allowed: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`
- [ ] Headers allowed: all via `allow_headers=["*"]`

### Rate Limiting
- [ ] Rate limiter configured: slowapi
  - Check: `main.py` has `Limiter(key_func=get_remote_address)`
- [ ] Default limit: 100 requests per minute per IP
  - Configurable via environment variable if needed
- [ ] Error handler for rate limit exceeded (HTTP 429)

### Database Connection Pool
- [ ] Connection pooling enabled for async operations
  - Use asyncpg for PostgreSQL
  - Connection pool size: 10-20 (based on workload)
- [ ] Connection timeout: 5-10 seconds
- [ ] Idle connection timeout: 30-60 seconds

---

## ✅ Data Validation

### Email Validation
- [ ] Email format validated using `email-validator` library
  - Check: `EmailStr` used in auth models
- [ ] Email lowercased before storing in database
- [ ] Duplicate emails prevented (unique constraint + exception handling)

### Tenant ID Validation
- [ ] Tenant ID format enforced: alphanumeric + hyphens
  - Regex: `^[a-z0-9-]{3,50}$`
- [ ] Tenant ID normalized: lowercase, spaces → underscores
  - Check: `_normalize_tenant_id()` in `onboarding_router.py`
- [ ] Tenant ID length: 3-50 characters
- [ ] `InvalidTenantIdError` raised for invalid format

### Role Enum Enforcement
- [ ] Roles restricted to: `cliente`, `analista`, `admin`, `superadmin`
  - Use Python Enum or Pydantic validator
  - Check: `app/auth_models.py` or `app/db/models.py`
- [ ] Invalid roles rejected with validation error

### Required Fields
- [ ] All request models enforce required fields via Pydantic
  - Email, password, tenant_id (if applicable), etc.
- [ ] Optional fields marked with `Optional[T]`
- [ ] Validation messages clear: "Field 'email' is required"

### File Upload Validation
- [ ] File type whitelist: `.pdf`, `.txt`, `.docx`, `.xlsx`
  - Check: `onboarding_router.py` validates `UploadFile.content_type`
- [ ] File size limit enforced: e.g., 10 MB per file
- [ ] File naming sanitized: no path traversal attacks
  - Use `pathlib.Path(file.filename).name` (basename only)

### Form Data Validation
- [ ] Onboarding form JSON schema validated
  - Check: `OnboardingForm` Pydantic model in `onboarding_models.py`
- [ ] Required fields for different industry types
  - Health: especialidades, profesionales
  - Restaurant: menu, horarios
  - etc.

---

## ✅ Admin Operations

### Seed Script
- [ ] Script to create initial admin user
  - File: `scripts/seed-saas.sh` or Python script
  - Creates: Admin user with strong password (prompt or generate)
  - Idempotent: doesn't fail if user exists
- [ ] Usage:
  ```bash
  cd backend-saas
  python scripts/seed.py --admin-email admin@webshooks.com --admin-password <strong-password>
  ```

### User Management
- [ ] Admin can activate users: `POST /auth/activate`
  - Requires: admin role, user email
  - Idempotent: no error if already active
- [ ] Admin can deactivate users: `DELETE /auth/users/{user_id}` or similar
  - Soft delete: `is_active = False`
- [ ] Admin can list all users: `GET /auth/users`
  - Pagination: `?page=1&limit=20`
  - Filters: by role, tenant_id, active status

### Analista Creation
- [ ] Admins can create analista users
  - Endpoint: `POST /auth/register` with `role=analista`
  - No `tenant_id` required for analistas
- [ ] Analista can manage all tenants

### User Listing & Search
- [ ] Users listed with pagination
- [ ] Search by email, role, tenant_id available
- [ ] Admin-only access verified

---

## ✅ Documentation

### README
- [ ] `backend-saas/README.md` exists with:
  - Project description
  - Setup instructions (PostgreSQL, Python, dependencies)
  - Environment variables explained
  - Running locally: `uvicorn app.main:app --reload`
  - Docker setup: `docker-compose up`
  - Testing: `pytest tests/`

### API Documentation
- [ ] `backend-saas/API_DOCS.md` exists with:
  - Overview of all endpoints
  - Curl examples for each endpoint
  - Python requests examples
  - Response formats with real data
  - Error codes and meanings
  - Onboarding flow walkthrough
  - Example tenant data

### Architecture Documentation
- [ ] `CLAUDE.md` in project root covers:
  - Architecture overview (SaaS vs Agents)
  - Key files and responsibilities
  - Rules and patterns
  - Onboarding flow
  - Query flow
- [ ] Updated if new endpoints or changes made

### Code Comments
- [ ] Complex logic has docstrings or inline comments
  - Password hashing, permission checks, etc.
- [ ] Function docstrings include:
  - What it does
  - Parameters with types
  - Return type
  - Exceptions it raises

### Swagger UI
- [ ] Verify Swagger docs are complete:
  - Open `http://localhost:8000/docs`
  - Check: all endpoints listed
  - Test: "Try it out" buttons work
  - Check: response examples shown

---

## 📋 Pre-Launch Tasks

- [ ] **Review Environment Variables**
  - Set `ENVIRONMENT=production`
  - Set `LOG_LEVEL=INFO` (not DEBUG)
  - Configure `ALLOWED_ORIGINS` for your domain
  - Set `BACKEND_AGENTS_URL=http://backend-agents:8001` (or correct address)
  - Verify `DATABASE_URL` points to production DB

- [ ] **Set Strong Admin Password**
  - Run seed script with secure password (16+ chars, mixed case, numbers, symbols)
  - Store password in secure vault (1Password, LastPass, etc.)
  - Never commit password to git

- [ ] **Configure CORS Origins**
  - Add your production domain(s) to `ALLOWED_ORIGINS`
  - Example: `ALLOWED_ORIGINS=https://app.webshooks.com`
  - Avoid wildcard `*` in production

- [ ] **Test Full Onboarding Flow Locally**
  - Run both backends locally:
    - Backend-SaaS: `python -m uvicorn app.main:app --port 8000`
    - Backend-Agents: `python -m uvicorn app.main:app --port 8001`
  - Complete flow:
    1. Register user: `POST /auth/register`
    2. Activate user (admin)
    3. Login: `POST /auth/login` → get API key
    4. Create tenant: `POST /onboarding/tenant`
    5. Upload file: `POST /onboarding/upload`
    6. Trigger ingestion: `POST http://localhost:8001/onboarding/ingest`
    7. Check status: `GET /onboarding/status/{tenant_id}`
    8. Query agent: `POST http://localhost:8001/agent/execute`

- [ ] **Verify Swagger Docs in Browser**
  - Open `http://localhost:8000/docs`
  - Check: all endpoints present
  - Verify: descriptions and examples readable
  - Test: "Authorize" button works (paste dummy API key)

- [ ] **Run Full Test Suite**
  ```bash
  cd backend-saas
  pytest tests/ -v --tb=short
  ```
  - All tests pass
  - No warnings in output
  - Coverage report generated (if configured)

- [ ] **Check Logs for Warnings**
  - Run app and monitor logs
  - Look for: deprecation warnings, security warnings, unhandled exceptions
  - Fix any warnings before deployment

- [ ] **Verify Database Backups**
  - Backup PostgreSQL database
  - Test restore process
  - Automate backups (e.g., daily backup script)
  - Store backups off-site (cloud storage, separate server)

---

## 🚀 Ready for VPS Migration

### Pre-Migration

- [ ] **Export Database Dump**
  ```bash
  pg_dump -U postgres agencia_web_b2b > backup_prod.sql
  ```
  - Compress: `gzip backup_prod.sql`
  - Store safely (encrypted, off-site)

- [ ] **Prepare Docker Compose File**
  - Update `docker-compose.prod.yml`:
    - Image versions pinned (not `latest`)
    - Environment variables use `.env.production`
    - Volumes for persistent data
    - Health check configured
    - Restart policy: `always`

- [ ] **Create VPS Configuration**
  - `.env.production` with all secrets (stored on VPS, not git)
  - Strong database password (random, 16+ chars)
  - API keys configured
  - Domain/IP addresses set

### Migration Steps

- [ ] **Deploy Docker Stack**
  ```bash
  docker-compose -f docker-compose.prod.yml up -d
  ```
  - Wait for services to start
  - Verify health checks passing

- [ ] **Run Migration Scripts**
  - Import database dump: `psql -U postgres -d agencia_web_b2b < backup_prod.sql`
  - Or run Prisma migrations if using ORM: `prisma migrate deploy`
  - Verify schema matches expectations

- [ ] **Create Admin User on VPS**
  ```bash
  docker exec backend-saas python scripts/seed.py \
    --admin-email admin@yourdomain.com \
    --admin-password <strong-password>
  ```

- [ ] **Test All Endpoints on VPS**
  - Auth flow: register → activate → login
  - Onboarding: tenant → upload → ingest → query
  - Admin: list users, activate user
  - Health check: `GET /health`
  - Verify trace IDs in logs

- [ ] **Monitor Logs for Errors**
  ```bash
  docker logs -f backend-saas
  docker logs -f backend-agents
  ```
  - Look for: connection errors, exceptions, warnings
  - Resolve any issues before going live

- [ ] **Configure Load Balancer/Nginx**
  - SSL/TLS certificate installed
  - Redirect HTTP → HTTPS
  - Proxy to backend (backend-saas:8000)
  - Health check configured

- [ ] **Set Up Monitoring & Alerting**
  - Log aggregation (ELK, CloudWatch, etc.)
  - Error tracking (Sentry, etc.)
  - Uptime monitoring
  - Alert on errors, high latency, etc.

- [ ] **Final Smoke Tests**
  - curl from external network: `curl https://yourdomain.com/health`
  - Test user signup → login flow
  - Test API Key functionality
  - Verify multitenant isolation

---

## Contact & Support

**Project Lead:** [Your name/team]
**On-Call Rotation:** [Team members]
**Alert Contact:** [Email/Slack/Phone]
**Incident Procedures:** [Link to runbook]

For questions or escalations, contact the backend team or project lead.

---

## Checklist Notes

This checklist should be completed **before any production deployment**. Each section corresponds to specific files and endpoints that should be verified. Use this checklist as both a planning tool and a sign-off document—have the team review and sign off on each major section before proceeding to the next phase.

**Sign-Off:**

- [ ] Code Quality Review — Signed by: _________________ Date: _______
- [ ] API & Documentation Review — Signed by: _________________ Date: _______
- [ ] Security Review — Signed by: _________________ Date: _______
- [ ] Database & Infrastructure Review — Signed by: _________________ Date: _______
- [ ] Testing & QA Sign-Off — Signed by: _________________ Date: _______
- [ ] Deployment Lead Approval — Signed by: _________________ Date: _______
