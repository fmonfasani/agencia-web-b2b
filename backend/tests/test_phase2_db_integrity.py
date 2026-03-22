import os
import psycopg2
import pytest

# Use the environment variable or a default development string
DSN = os.getenv("POSTGRES_PRISMA_URL") or "postgresql://postgres:password@localhost:5432/agenciab2b"

@pytest.fixture(scope="module")
def db_conn():
    conn = psycopg2.connect(DSN)
    yield conn
    conn.close()

def test_no_duplicate_users_by_email(db_conn):
    """Check for users with the same email (case-insensitive check)."""
    with db_conn.cursor() as cur:
        cur.execute("""
            SELECT LOWER(TRIM(email)), COUNT(*)
            FROM "User"
            GROUP BY LOWER(TRIM(email))
            HAVING COUNT(*) > 1
        """)
        rows = cur.fetchall()
        assert len(rows) == 0, f"Duplicated users found: {rows}"

def test_no_orphan_memberships(db_conn):
    """Check for memberships pointing to non-existent tenants."""
    with db_conn.cursor() as cur:
        cur.execute("""
            SELECT m.id
            FROM "Membership" m
            LEFT JOIN "Tenant" t ON m."tenantId" = t.id
            WHERE t.id IS NULL
        """)
        rows = cur.fetchall()
        assert len(rows) == 0, f"Orphan memberships found: {rows}"

def test_no_orphan_sessions(db_conn):
    """Check for sessions with invalid tenant_id (if set)."""
    with db_conn.cursor() as cur:
        cur.execute("""
            SELECT s.id
            FROM "Session" s
            LEFT JOIN "Tenant" t ON s."tenantId" = t.id
            WHERE s."tenantId" IS NOT NULL AND t.id IS NULL
        """)
        rows = cur.fetchall()
        assert len(rows) == 0, f"Invalid session tenant references: {rows}"

def test_audit_log_tenant_consistency(db_conn):
    """Check if audit events have a valid tenant if linked to one."""
    with db_conn.cursor() as cur:
        cur.execute("""
            SELECT a.id
            FROM "AuditEvent" a
            LEFT JOIN "Tenant" t ON a."tenantId" = t.id
            WHERE a."tenantId" IS NOT NULL AND t.id IS NULL
        """)
        rows = cur.fetchall()
        assert len(rows) == 0, f"Orphan audit events found: {rows}"
