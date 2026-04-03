"""
Persistence tests for agent_request_traces.

Requires:
  - Backend running at BACKEND_URL (default: http://localhost:8000)
  - PostgreSQL accessible at POSTGRES_PRISMA_URL

Run with:
    pytest backend/tests/test_db.py -v
"""
import os
import time

import httpx
import psycopg2
import pytest

DSN = os.getenv(
    "POSTGRES_PRISMA_URL",
    "postgresql://postgres:Karaoke27570Echeverria@localhost:5432/agencia_web_b2b",
)
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
EXPECTED_TENANT = "tenant_test"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def db():
    conn = psycopg2.connect(DSN)
    yield conn
    conn.close()


def _call_agent(query: str = "buscar empresas de software en Argentina") -> str:
    """Hit /agent/execute and return the trace_id from the response."""
    with httpx.Client(timeout=90.0) as client:
        r = client.post(
            f"{BACKEND_URL}/agent/execute",
            json={"query": query, "tenant_id": EXPECTED_TENANT},
        )
    assert r.status_code == 200, f"Agent returned {r.status_code}: {r.text[:300]}"
    body = r.json()
    assert "trace_id" in body, f"No trace_id in response: {body}"
    return body["trace_id"]


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_trace_row_persisted(db):
    """After a successful request, exactly one row must appear in agent_request_traces."""
    trace_id = _call_agent()
    time.sleep(2.0)  # background task needs time to commit

    with db.cursor() as cur:
        cur.execute(
            "SELECT COUNT(*) FROM agent_request_traces WHERE request_id = %s",
            (trace_id,),
        )
        (count,) = cur.fetchone()

    assert count == 1, f"Expected 1 trace row for request_id={trace_id}, got {count}"


def test_trace_iterations_bounded(db):
    """iterations must be >= 1 and <= MAX_ITERATIONS (5)."""
    trace_id = _call_agent()
    time.sleep(2.0)

    with db.cursor() as cur:
        cur.execute(
            "SELECT iterations FROM agent_request_traces WHERE request_id = %s",
            (trace_id,),
        )
        row = cur.fetchone()

    assert row is not None, f"No trace for request_id={trace_id}"
    (iterations,) = row
    assert iterations <= 3, f"Expected iterations <= 3, got {iterations}"
    assert iterations >= 1, f"Expected iterations >= 1, got {iterations}"


def test_trace_finish_reason_present(db):
    """finish_reason must be set to a known value."""
    valid = {"results_found", "no_results", "forced_stop", "max_iterations", "loop_detected", "llm_error"}
    trace_id = _call_agent()
    time.sleep(2.0)

    with db.cursor() as cur:
        cur.execute(
            "SELECT finish_reason FROM agent_request_traces WHERE request_id = %s",
            (trace_id,),
        )
        row = cur.fetchone()

    assert row is not None
    (finish_reason,) = row
    assert finish_reason is not None, "finish_reason must not be NULL"
    assert finish_reason in valid, f"Unexpected finish_reason: {finish_reason!r}"


def test_trace_total_ms_positive(db):
    """total_ms must be > 0 — agent took at least some time."""
    trace_id = _call_agent()
    time.sleep(2.0)

    with db.cursor() as cur:
        cur.execute(
            "SELECT total_ms FROM agent_request_traces WHERE request_id = %s",
            (trace_id,),
        )
        row = cur.fetchone()

    assert row is not None
    (total_ms,) = row
    assert total_ms is not None, "total_ms must not be NULL"
    assert total_ms > 0, f"Expected total_ms > 0, got {total_ms}"


def test_trace_tenant_matches(db):
    """tenant_id in the DB must match what was sent in the request."""
    trace_id = _call_agent()
    time.sleep(2.0)

    with db.cursor() as cur:
        cur.execute(
            "SELECT tenant_id FROM agent_request_traces WHERE request_id = %s",
            (trace_id,),
        )
        row = cur.fetchone()

    assert row is not None
    (tenant_id,) = row
    assert tenant_id == EXPECTED_TENANT, (
        f"Expected tenant_id={EXPECTED_TENANT!r}, got {tenant_id!r}"
    )


def test_trace_no_error_on_success(db):
    """A successful request must have had_error=False and success=True."""
    trace_id = _call_agent()
    time.sleep(2.0)

    with db.cursor() as cur:
        cur.execute(
            "SELECT had_error, success FROM agent_request_traces WHERE request_id = %s",
            (trace_id,),
        )
        row = cur.fetchone()

    assert row is not None
    had_error, success = row
    assert not had_error, f"had_error should be False, got {had_error}"
    assert success, f"success should be True, got {success}"


def test_trace_timing_columns_populated(db):
    """embedding_ms and rag_ms must be set (agent always runs RAG)."""
    trace_id = _call_agent()
    time.sleep(2.0)

    with db.cursor() as cur:
        cur.execute(
            "SELECT embedding_ms, rag_ms FROM agent_request_traces WHERE request_id = %s",
            (trace_id,),
        )
        row = cur.fetchone()

    assert row is not None
    embedding_ms, rag_ms = row
    assert embedding_ms is not None and embedding_ms >= 0, (
        f"embedding_ms should be >= 0, got {embedding_ms}"
    )
    assert rag_ms is not None and rag_ms >= 0, (
        f"rag_ms should be >= 0, got {rag_ms}"
    )
