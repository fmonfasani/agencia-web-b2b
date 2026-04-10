import os
import time
import uuid

import httpx
import psycopg2
import pytest

# Use the environment variable or a default development string
DSN = os.environ.get("POSTGRES_PRISMA_URL") or os.environ.get("DATABASE_URL")
if not DSN:
    raise RuntimeError(
        "Set POSTGRES_PRISMA_URL or DATABASE_URL env var before running tests."
    )

BACKEND_URL = "http://localhost:8000"
MAX_ITERATIONS = 5

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


# ---------------------------------------------------------------------------
# agent_request_traces tests
# ---------------------------------------------------------------------------

def _execute_agent(tenant_id: str = "tenant_test", query: str = "buscar leads de software en Argentina") -> str:
    """Hit the agent endpoint and return the trace_id."""
    with httpx.Client(timeout=60.0) as client:
        r = client.post(
            f"{BACKEND_URL}/agent/execute",
            json={"query": query, "tenant_id": tenant_id},
        )
    assert r.status_code == 200, f"Agent returned {r.status_code}: {r.text}"
    return r.json()["trace_id"]


def test_trace_persisted_after_request(db_conn):
    """After a successful agent call, one row must exist in agent_request_traces."""
    trace_id = _execute_agent()
    time.sleep(1.5)  # give background task time to commit

    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT iterations, finish_reason, had_error FROM agent_request_traces WHERE request_id = %s",
            (trace_id,),
        )
        row = cur.fetchone()

    assert row is not None, f"No trace found for request_id={trace_id}"
    iterations, finish_reason, had_error = row
    assert iterations >= 1, f"Expected iterations >= 1, got {iterations}"
    assert not had_error, f"had_error should be False, got {had_error}"


def test_trace_iterations_within_bounds(db_conn):
    """Every trace row must have 1 <= iterations <= MAX_ITERATIONS."""
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT request_id, iterations FROM agent_request_traces WHERE iterations IS NOT NULL ORDER BY created_at DESC LIMIT 20"
        )
        rows = cur.fetchall()

    assert len(rows) > 0, "No traces in DB — run test_trace_persisted_after_request first"
    for request_id, iterations in rows:
        assert 1 <= iterations <= MAX_ITERATIONS, (
            f"request_id={request_id} has iterations={iterations} outside [1, {MAX_ITERATIONS}]"
        )


def test_trace_finish_reason_not_max_when_results(db_conn):
    """Rows with results_count > 0 must have finish_reason='results_found', not 'max_iterations'."""
    with db_conn.cursor() as cur:
        cur.execute(
            """
            SELECT request_id, finish_reason, results_count
            FROM agent_request_traces
            WHERE results_count > 0
            ORDER BY created_at DESC
            LIMIT 20
            """
        )
        rows = cur.fetchall()

    for request_id, finish_reason, results_count in rows:
        assert finish_reason == "results_found", (
            f"request_id={request_id} has results_count={results_count} "
            f"but finish_reason='{finish_reason}' (expected 'results_found')"
        )
