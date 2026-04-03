# Admin Seeding Script Guide

## Overview

The `backend-saas/seed_admin.py` script initializes the first admin user in the backend-saas platform database.

## Features

- **Automatic User Creation**: Creates the admin user with email `admin@webshooks.com`
- **Duplicate Handling**: Gracefully handles cases where the admin already exists
- **Type-Safe**: Full Python type hints and proper exception handling
- **Clear Output**: Displays credentials and security warnings
- **Cross-Platform**: Works on Windows, Linux, and macOS with proper UTF-8 support

## Usage

### Basic Execution

```bash
cd backend-saas
python seed_admin.py
```

### Output on First Run (New Database)

```
======================================================================
[OK] Admin user created successfully!
======================================================================
   Email:     admin@webshooks.com
   Password:  ChangeMe123!
   ID:        c_abc123def456...
   API Key:   wh_xyz789abc123...
======================================================================

[WARNING] IMPORTANTE:
   1. Guardá el API Key en lugar seguro (no compartir)
   2. Cambiá la contraseña en la siguiente acción
   3. No compartir esta información con nadie

```

### Output on Subsequent Runs (Admin Already Exists)

```
======================================================================
[INFO] Admin user already exists
======================================================================
   Email: admin@webshooks.com
   Status: ACTIVE
======================================================================

[INFO] The admin user is already initialized.

```

## Admin Credentials

**Email**: `admin@webshooks.com`
**Password**: `ChangeMe123!` (should be changed immediately)
**Role**: `admin`
**Status**: `ACTIVE`

## Security Notes

1. **API Key**: Store securely (in 1Password, Vault, or similar)
2. **Password**: Change immediately after first login
3. **Don't Share**: Never share these credentials via email or chat
4. **Rotation**: Consider rotating every 90 days

## Integration with Backend

The script uses:
- `app.auth_service.create_user()` - Core user creation function
- `app.lib.exceptions.DuplicateEmailError` - Handles duplicate detection
- PostgreSQL - Direct database connection via `app.auth_service.DB_DSN`

## Architecture Alignment

✅ Follows CLAUDE.md guidelines:
- Uses proper imports from `app.*`
- Async/await ready (DB operations)
- Type hints on all functions
- Specific exception handling
- Logging via print (no logger required for seed script)
- Pydantic models through auth_service

## File Location

```
backend-saas/
├── seed_admin.py          ← Admin seeding script
├── app/
│   ├── auth_service.py
│   ├── lib/
│   │   └── exceptions.py
│   └── ...
└── ...
```

## Testing Verification

Run the script multiple times to confirm:

1. ✅ First run: Admin created with API Key
2. ✅ Second run: Duplicate detected gracefully
3. ✅ Login verification: `POST /auth/login` accepts credentials
4. ✅ Database state: User is ACTIVE in PostgreSQL

## Example: Login Test

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@webshooks.com",
    "password": "ChangeMe123!"
  }'
```

## Troubleshooting

### Issue: Database Connection Error
**Solution**: Verify `DATABASE_URL` env var or update `DEFAULT_DSN` in `auth_service.py`

### Issue: Unicode Encoding Error (Windows)
**Solution**: Script auto-detects Windows and sets UTF-8 encoding

### Issue: Import Errors
**Solution**: Ensure you're running from `backend-saas/` directory with `python seed_admin.py`

---

**Created**: April 2, 2026  
**Status**: Production Ready  
**Maintainer**: agencia-web-b2b Team
