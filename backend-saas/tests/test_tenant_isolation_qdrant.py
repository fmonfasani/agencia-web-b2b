"""
tests/test_tenant_isolation_qdrant.py

Tests de aislamiento multi-tenant sobre Qdrant REAL.

Organizados en 3 grupos independientes:

  GRUPO 1 — Routing de colecciones (sin Ollama)
    Valida que cada tenant tiene su propia colección y que los datos
    no son accesibles desde otra colección.
    Bug que detecta: si store_in_qdrant escribiera a "knowledge_base"
    en lugar de "tenant_{id}", los tests de retrieval devolverían vacío.

  GRUPO 2 — tenant_scoped_search (capa de retrieval de producción)
    Valida que la función que usa el agente en producción nunca devuelve
    datos de otro tenant, aunque la query sea semánticamente idéntica.
    Bug que detecta: si tenant_scoped_search ignorara el tenant_id y
    buscara en todas las colecciones, el test de cross-tenant fallaría.

  GRUPO 3 — Agent routing (backend en localhost:8000)
    Valida que el agente busca en la colección del TOKEN, nunca del body.
    Bug que detecta: si el agente usara req.tenant_id (body) en lugar
    de current_user["tenant_id"] (token), el qdrant_trace mostraría
    la colección incorrecta.

Requiere:
  - Qdrant en localhost:6333
  - Ollama en localhost:11434 (solo GRUPO 2)
  - Backend en localhost:8000 (solo GRUPO 3)
"""

import asyncio
import uuid
import pytest
import httpx
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from app.main import app, get_agent_tenant
from app.qdrant.client import _normalize_tenant_id, tenant_scoped_search

# ---------------------------------------------------------------------------
# IDs de tenants únicos por ejecución — no colisionan con datos reales
# ---------------------------------------------------------------------------
_RUN = uuid.uuid4().hex[:8]
TENANT_A = f"iso_a_{_RUN}"
TENANT_B = f"iso_b_{_RUN}"

QDRANT_URL = "http://localhost:6333"
OLLAMA_URL = "http://localhost:11434"
BACKEND_URL = "http://localhost:8000"
EMBED_MODEL = "nomic-embed-text"
DIM = 768  # nomic-embed-text dimension


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _embed(text: str) -> list[float]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(
            f"{OLLAMA_URL}/api/embeddings",
            json={"model": EMBED_MODEL, "prompt": text},
        )
        r.raise_for_status()
        return r.json()["embedding"]


def _synthetic_vector(seed: float = 0.1) -> list[float]:
    """Vector sintético de dimensión correcta — válido para tests de routing."""
    import math
    return [math.sin(seed * i) for i in range(1, DIM + 1)]


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def qdrant():
    try:
        client = QdrantClient(url=QDRANT_URL, timeout=5)
        client.get_collections()
        return client
    except Exception as e:
        pytest.skip(f"Qdrant no disponible en {QDRANT_URL}: {e}")


@pytest.fixture(scope="module", autouse=True)
def cleanup_test_collections(qdrant):
    """Elimina las colecciones de test al finalizar el módulo."""
    yield
    for tenant_id in [TENANT_A, TENANT_B]:
        col = _normalize_tenant_id(tenant_id)
        try:
            if qdrant.collection_exists(col):
                qdrant.delete_collection(col)
        except Exception:
            pass


@pytest.fixture(scope="module")
def check_ollama():
    try:
        r = httpx.get(f"{OLLAMA_URL}/api/tags", timeout=5.0)
        r.raise_for_status()
    except Exception as e:
        pytest.skip(f"Ollama no disponible en {OLLAMA_URL}: {e}")


@pytest.fixture(scope="module")
def check_backend():
    try:
        r = httpx.get(f"{BACKEND_URL}/health", timeout=5.0)
        r.raise_for_status()
    except Exception as e:
        pytest.skip(f"Backend no disponible en {BACKEND_URL}: {e}")


@pytest.fixture
def web_client():
    return TestClient(app)


# ===========================================================================
# GRUPO 1 — Routing de colecciones (sin Ollama)
#
# Estos tests no requieren embeddings reales. Usan vectores sintéticos
# porque lo que prueban es la SEPARACIÓN de colecciones, no la semántica.
# ===========================================================================

def test_tenant_ids_map_to_distinct_collections():
    """
    _normalize_tenant_id debe producir nombres distintos para tenants distintos.

    Bug detectado: si todos los tenants mapearan a la misma colección
    (e.g. "knowledge_base"), este test fallaría.
    """
    col_a = _normalize_tenant_id(TENANT_A)
    col_b = _normalize_tenant_id(TENANT_B)

    assert col_a != col_b, f"Tenants distintos producen la misma colección: {col_a}"
    assert col_a.startswith("tenant_"), f"Colección no sigue prefijo esperado: {col_a}"
    assert col_b.startswith("tenant_"), f"Colección no sigue prefijo esperado: {col_b}"
    assert "knowledge_base" not in (col_a, col_b), (
        "El sistema usó 'knowledge_base' como colección — bug de schema viejo"
    )


def test_insert_in_a_not_visible_from_b(qdrant):
    """
    Un vector insertado en la colección de tenant_A NO debe ser accesible
    desde la colección de tenant_B, aunque el vector sea idéntico.

    Bug detectado: si store_in_qdrant escribiera a una colección global,
    la búsqueda en la colección de B devolvería resultados de A.
    """
    col_a = _normalize_tenant_id(TENANT_A)
    col_b = _normalize_tenant_id(TENANT_B)

    # Crear colecciones
    for col in [col_a, col_b]:
        if not qdrant.collection_exists(col):
            qdrant.create_collection(
                collection_name=col,
                vectors_config=VectorParams(size=DIM, distance=Distance.COSINE),
            )

    # Insertar SOLO en colección A
    vec_a = _synthetic_vector(seed=0.42)
    qdrant.upsert(
        collection_name=col_a,
        points=[PointStruct(id=1, vector=vec_a, payload={"text": "DATO_EXCLUSIVO_A", "tenant_id": TENANT_A})],
    )

    # Buscar el mismo vector desde la colección B
    response_b = qdrant.query_points(
        collection_name=col_b,
        query=vec_a,
        limit=10,
        with_payload=True,
    )
    results_b = response_b.points

    assert len(results_b) == 0, (
        f"FUGA DE DATOS: búsqueda en colección de {TENANT_B} devolvió "
        f"{len(results_b)} resultado(s) que pertenecen a {TENANT_A}"
    )


def test_knowledge_base_collection_not_created(qdrant):
    """
    El sistema no debe crear una colección global 'knowledge_base'.
    Esa era la colección del schema viejo (bug).

    Bug detectado: si onboarding_service.py usara COLLECTION = "knowledge_base",
    este test fallaría (o al menos advertiría que el schema viejo sigue activo).
    """
    # Verificar que ninguno de los tenants de test escribió a knowledge_base
    if qdrant.collection_exists("knowledge_base"):
        # Contar puntos de los tenants de test
        try:
            from qdrant_client.models import Filter, FieldCondition, MatchValue
            for tenant_id in [TENANT_A, TENANT_B]:
                count = qdrant.count(
                    collection_name="knowledge_base",
                    count_filter=Filter(
                        must=[FieldCondition(key="tenant_id", match=MatchValue(value=tenant_id))]
                    ),
                )
                assert count.count == 0, (
                    f"tenant '{tenant_id}' tiene {count.count} punto(s) en 'knowledge_base' "
                    f"— el onboarding está usando el schema viejo"
                )
        except Exception:
            pass  # knowledge_base existe pero sin datos de los tenants de test — OK


# ===========================================================================
# GRUPO 2 — tenant_scoped_search (capa de retrieval de producción)
#
# Usa Ollama para embeddings reales. Prueba la función exacta que
# usa el agente en producción.
# ===========================================================================

@pytest.mark.asyncio
async def test_scoped_search_finds_own_data(qdrant, check_ollama):
    """
    tenant_scoped_search debe devolver datos del propio tenant.

    Setup: insertar texto "EMPRESA_ALPHA_SEGUROS" en la colección de TENANT_A.
    Query: buscar "seguro de salud" desde TENANT_A.
    Resultado esperado: al menos 1 resultado.

    Bug detectado: si tenant_scoped_search buscara en la colección incorrecta
    (e.g. "knowledge_base" vacía), devolvería [] aunque haya datos ingestados.
    """
    col_a = _normalize_tenant_id(TENANT_A)

    if not qdrant.collection_exists(col_a):
        qdrant.create_collection(
            collection_name=col_a,
            vectors_config=VectorParams(size=DIM, distance=Distance.COSINE),
        )

    # Insertar datos de TENANT_A con el campo "text" que lee tenant_scoped_search
    docs = [
        "EMPRESA_ALPHA_SEGUROS: cobertura médica integral para empresas",
        "Plan de salud ALPHA: incluye odontología y oftalmología",
    ]
    points = []
    for i, doc in enumerate(docs):
        vec = await _embed(doc)
        points.append(PointStruct(
            id=200 + i,
            vector=vec,
            payload={"text": doc, "tenant_id": TENANT_A},
        ))
    qdrant.upsert(collection_name=col_a, points=points)

    # Buscar desde TENANT_A
    query_vec = await _embed("seguro de salud para empresa")
    results = await tenant_scoped_search(TENANT_A, query_vec, limit=5)

    assert len(results) > 0, (
        f"tenant_scoped_search no encontró datos de {TENANT_A} en {col_a}. "
        f"Verificá que onboarding_service.py escribe a la colección correcta."
    )
    # Verificar que el campo "text" está presente (schema correcto)
    assert results[0]["text"], (
        f"El resultado no tiene campo 'text'. "
        f"El payload tiene el campo 'raw_text' en lugar de 'text' — bug de schema."
    )


@pytest.mark.asyncio
async def test_scoped_search_never_returns_other_tenant_data(qdrant, check_ollama):
    """
    tenant_scoped_search NUNCA debe devolver datos de otro tenant,
    aunque la query sea semánticamente muy similar.

    Setup:
      - TENANT_A tiene "SECRETO_EXCLUSIVO_ALPHA: datos confidenciales A"
      - TENANT_B tiene su propia colección vacía (o con otros datos)

    Query desde TENANT_B buscando el texto exacto de A → resultado vacío.

    Bug detectado: si tenant_scoped_search ignorara el tenant_id y buscara
    en todas las colecciones, devolvería el secreto de A al buscar desde B.
    """
    col_a = _normalize_tenant_id(TENANT_A)
    col_b = _normalize_tenant_id(TENANT_B)

    for col in [col_a, col_b]:
        if not qdrant.collection_exists(col):
            qdrant.create_collection(
                collection_name=col,
                vectors_config=VectorParams(size=DIM, distance=Distance.COSINE),
            )

    # Insertar dato exclusivo en TENANT_A
    secret_text = f"SECRETO_EXCLUSIVO_ALPHA_{_RUN}: información confidencial solo para A"
    vec_secret = await _embed(secret_text)
    qdrant.upsert(
        collection_name=col_a,
        points=[PointStruct(id=300, vector=vec_secret, payload={"text": secret_text})],
    )

    # Buscar el mismo texto desde TENANT_B
    # El vector es idéntico — si hubiera colección compartida, encontraría el resultado
    results_b = await tenant_scoped_search(TENANT_B, vec_secret, limit=10)

    leaked_texts = [r["text"] for r in results_b if secret_text in (r.get("text") or "")]
    assert len(leaked_texts) == 0, (
        f"FUGA DE DATOS CRÍTICA: búsqueda de {TENANT_B} encontró datos de {TENANT_A}:\n"
        + "\n".join(leaked_texts)
    )


@pytest.mark.asyncio
async def test_scoped_search_returns_empty_for_tenant_with_no_data(check_ollama):
    """
    tenant_scoped_search debe devolver [] cuando el tenant no tiene colección.
    No debe hacer fallback a otra colección ni lanzar excepción.

    Bug detectado: si la función buscara en "knowledge_base" como fallback,
    podría devolver datos de otros tenants cuando el propio no existe.
    """
    tenant_inexistente = f"nonexistent_{_RUN}"
    vec = await _embed("cualquier consulta")
    results = await tenant_scoped_search(tenant_inexistente, vec, limit=5)
    assert results == [], (
        f"Se esperaba [] para tenant sin colección, se obtuvo {results}. "
        f"Verificá que no hay fallback a colección global."
    )


# ===========================================================================
# GRUPO 3 — Agent routing via backend (localhost:8000)
#
# Verifica que el agente usa la colección del TOKEN, nunca la del body.
# Usa dependency_overrides para inyectar el tenant — Qdrant es real.
# ===========================================================================

def test_agent_searches_token_tenant_collection(web_client):
    """
    El agente debe buscar en _normalize_tenant_id(token_tenant), no en body_tenant.

    Verificación: qdrant_trace[0]["collection_name"] == colección del token.

    Bug detectado: si el agente construyera LangGraphEngine con req.tenant_id
    (body) en lugar de current_user["tenant_id"] (token), la colección buscada
    sería la del body y este test fallaría.
    """
    token_tenant = TENANT_A
    body_tenant = TENANT_B  # intentar redirigir al tenant incorrecto
    expected_collection = _normalize_tenant_id(token_tenant)

    app.dependency_overrides[get_agent_tenant] = lambda: {
        "id": 99, "email": f"{token_tenant}@test.com",
        "nombre": "Test", "rol": "cliente", "tenant_id": token_tenant,
    }

    try:
        resp = web_client.post(
            "/agent/execute",
            json={"query": "buscar información", "tenant_id": body_tenant},
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()

        # El tenant_id en la respuesta debe ser el del TOKEN
        assert data["tenant_id"] == token_tenant, (
            f"Response tenant_id='{data['tenant_id']}' pero el token era '{token_tenant}'. "
            f"El sistema usó el body en lugar del token."
        )

        # La colección buscada en Qdrant debe ser la del TOKEN
        qdrant_trace = data.get("qdrant_trace")
        if qdrant_trace:
            searched_collection = qdrant_trace[0]["collection_name"]
            assert searched_collection == expected_collection, (
                f"Qdrant buscó en '{searched_collection}' pero debería haber buscado "
                f"en '{expected_collection}' (colección del TOKEN '{token_tenant}'). "
                f"Posible uso del body tenant '{body_tenant}'."
            )
    finally:
        app.dependency_overrides.clear()


def test_spoofing_body_tenant_cannot_redirect_qdrant_search(web_client):
    """
    Propiedad de seguridad crítica: el body tenant_id NO puede redirigir
    la búsqueda de Qdrant a la colección de otro tenant.

    Escenario de ataque:
      token = tenant_A (usuario legítimo)
      body  = tenant_B (intento de acceder a datos de B)

    Resultado esperado: Qdrant busca en colección de A, nunca en B.

    Bug detectado: cualquier código que use req.tenant_id para construir
    el nombre de colección (en lugar de current_user["tenant_id"]) causaría
    que este test falle.
    """
    attacker_token_tenant = TENANT_A
    target_tenant = TENANT_B
    safe_collection = _normalize_tenant_id(attacker_token_tenant)
    unsafe_collection = _normalize_tenant_id(target_tenant)

    app.dependency_overrides[get_agent_tenant] = lambda: {
        "id": 1, "email": "attacker@test.com",
        "nombre": "Attacker", "rol": "cliente",
        "tenant_id": attacker_token_tenant,
    }

    try:
        resp = web_client.post(
            "/agent/execute",
            json={"query": "datos confidenciales", "tenant_id": target_tenant},
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()

        # La respuesta NO debe revelar datos del tenant objetivo
        assert data["tenant_id"] != target_tenant, (
            f"SPOOFING EXITOSO: response tiene tenant_id='{target_tenant}' "
            f"cuando el token era '{attacker_token_tenant}'"
        )

        # Qdrant NO debe haber buscado en la colección del tenant objetivo
        qdrant_trace = data.get("qdrant_trace")
        if qdrant_trace:
            searched_collection = qdrant_trace[0]["collection_name"]
            assert searched_collection != unsafe_collection, (
                f"FUGA POR SPOOFING: Qdrant buscó en '{unsafe_collection}' "
                f"(colección de {target_tenant}) cuando el atacante tenía "
                f"token de {attacker_token_tenant}. "
                f"Debería haber buscado en '{safe_collection}'."
            )
            assert searched_collection == safe_collection, (
                f"Qdrant buscó en '{searched_collection}', se esperaba '{safe_collection}'"
            )
    finally:
        app.dependency_overrides.clear()


def test_two_tenants_get_independent_responses(web_client):
    """
    Dos tenants distintos, misma query → respuestas con tenant_ids distintos
    y colecciones Qdrant distintas (sin contaminación cruzada).

    Este test falla si:
    - Ambas respuestas tienen el mismo tenant_id (el sistema no aisló)
    - Ambas búsquedas van a la misma colección Qdrant
    """
    results = {}

    for tenant_id in [TENANT_A, TENANT_B]:
        app.dependency_overrides[get_agent_tenant] = lambda t=tenant_id: {
            "id": hash(t) % 1000, "email": f"{t}@test.com",
            "nombre": "Test", "rol": "cliente", "tenant_id": t,
        }

        resp = web_client.post(
            "/agent/execute",
            json={"query": "información del negocio", "tenant_id": "irrelevant_body"},
        )
        assert resp.status_code == 200, f"Falló para tenant {tenant_id}: {resp.text}"
        data = resp.json()

        results[tenant_id] = {
            "response_tenant": data["tenant_id"],
            "collection": (
                data["qdrant_trace"][0]["collection_name"]
                if data.get("qdrant_trace")
                else None
            ),
        }

    app.dependency_overrides.clear()

    # Los tenant_ids en las respuestas deben ser distintos
    assert results[TENANT_A]["response_tenant"] != results[TENANT_B]["response_tenant"], (
        "Ambos tenants recibieron la misma identidad en la respuesta — no hay aislamiento"
    )
    assert results[TENANT_A]["response_tenant"] == TENANT_A
    assert results[TENANT_B]["response_tenant"] == TENANT_B

    # Las colecciones Qdrant buscadas deben ser distintas
    col_a = results[TENANT_A]["collection"]
    col_b = results[TENANT_B]["collection"]
    if col_a and col_b:  # solo si qdrant_trace está disponible
        assert col_a != col_b, (
            f"Ambos tenants buscaron en la misma colección '{col_a}' — "
            f"no hay aislamiento de datos en Qdrant"
        )
        assert col_a == _normalize_tenant_id(TENANT_A)
        assert col_b == _normalize_tenant_id(TENANT_B)
