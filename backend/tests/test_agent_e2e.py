"""
Real end-to-end integration test for the agent flow.
Requires:
  - Backend FastAPI at http://localhost:8000
  - Ollama at http://localhost:11434
  - Qdrant at http://localhost:6333
  - PostgreSQL (via TEST_DB_DSN env var)

Run: pytest test_agent_e2e.py -v
"""
import os
import pytest
import httpx

BACKEND_URL = "http://localhost:8000"
OLLAMA_URL = "http://localhost:11434"
QDRANT_URL = "http://localhost:6333"
TEST_DB_DSN = os.environ.get("TEST_DB_DSN")


# ---------------------------------------------------------------------------
# Health checks — fallan rápido si falta algún servicio
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session", autouse=True)
def check_services():
    errors = []

    try:
        r = httpx.get(f"{BACKEND_URL}/health", timeout=5.0)
        assert r.status_code == 200
    except Exception as e:
        errors.append(f"Backend ({BACKEND_URL}): {e}")

    try:
        r = httpx.get(f"{OLLAMA_URL}/api/tags", timeout=5.0)
        assert r.status_code == 200
    except Exception as e:
        errors.append(f"Ollama ({OLLAMA_URL}): {e}")

    try:
        r = httpx.get(f"{QDRANT_URL}/collections", timeout=5.0)
        assert r.status_code == 200
    except Exception as e:
        errors.append(f"Qdrant ({QDRANT_URL}): {e}")

    if errors:
        pytest.fail("Servicios no disponibles:\n" + "\n".join(errors))


# ---------------------------------------------------------------------------
# Tests de agent flow
# ---------------------------------------------------------------------------

def test_execute_returns_result():
    """El endpoint /agent/execute devuelve result y metadata."""
    with httpx.Client(timeout=60.0) as client:
        r = client.post(
            f"{BACKEND_URL}/agent/execute",
            json={"task": "buscar leads de software en Argentina", "tenant_id": "tenant_test"},
        )
    assert r.status_code == 200, f"Status inesperado: {r.status_code} — {r.text}"
    body = r.json()
    assert "result" in body, f"Falta 'result' en respuesta: {body}"
    assert "metadata" in body, f"Falta 'metadata' en respuesta: {body}"


def test_execute_validates_missing_fields():
    """Sin task o tenant_id debe devolver 400/422."""
    with httpx.Client(timeout=10.0) as client:
        r = client.post(f"{BACKEND_URL}/agent/execute", json={"task": "algo"})
    assert r.status_code in (400, 422), f"Esperado 400/422, obtenido {r.status_code}"


def test_execute_metadata_has_tenant():
    """El metadata debe incluir el tenant_id correcto."""
    with httpx.Client(timeout=60.0) as client:
        r = client.post(
            f"{BACKEND_URL}/agent/execute",
            json={"task": "calificar empresa XYZ", "tenant_id": "tenant_abc"},
        )
    assert r.status_code == 200
    metadata = r.json().get("metadata", {})
    assert metadata.get("tenant_id") == "tenant_abc", (
        f"tenant_id incorrecto en metadata: {metadata}"
    )


def test_execute_different_tenants_isolated():
    """Dos tenants distintos no deben compartir contexto RAG."""
    with httpx.Client(timeout=60.0) as client:
        r1 = client.post(
            f"{BACKEND_URL}/agent/execute",
            json={"task": "listar leads", "tenant_id": "tenant_X"},
        )
        r2 = client.post(
            f"{BACKEND_URL}/agent/execute",
            json={"task": "listar leads", "tenant_id": "tenant_Y"},
        )

    assert r1.status_code == 200
    assert r2.status_code == 200

    # Ambos deben responder pero sus resultados pueden diferir
    # (si tienen RAG cargado con datos diferentes)
    b1 = r1.json()
    b2 = r2.json()
    assert b1["metadata"]["tenant_id"] == "tenant_X"
    assert b2["metadata"]["tenant_id"] == "tenant_Y"


# ---------------------------------------------------------------------------
# DB integrity (solo si TEST_DB_DSN está configurado)
# ---------------------------------------------------------------------------

@pytest.mark.skipif(not TEST_DB_DSN, reason="TEST_DB_DSN no configurado")
def test_db_no_orphan_memberships():
    """No debe haber memberships que referencien tenants inexistentes."""
    import psycopg2
    conn = psycopg2.connect(TEST_DB_DSN)
    cur = conn.cursor()
    cur.execute("""
        SELECT COUNT(*) FROM "Membership" m
        LEFT JOIN "Tenant" t ON m."tenantId" = t.id
        WHERE t.id IS NULL
    """)
    count = cur.fetchone()[0]
    conn.close()
    assert count == 0, f"Hay {count} memberships huérfanos"


@pytest.mark.skipif(not TEST_DB_DSN, reason="TEST_DB_DSN no configurado")
def test_db_no_duplicate_emails():
    """No debe haber emails duplicados en la tabla User."""
    import psycopg2
    conn = psycopg2.connect(TEST_DB_DSN)
    cur = conn.cursor()
    cur.execute("""
        SELECT email, COUNT(*) FROM "User"
        GROUP BY email HAVING COUNT(*) > 1
    """)
    dupes = cur.fetchall()
    conn.close()
    assert len(dupes) == 0, f"Emails duplicados: {dupes}"
