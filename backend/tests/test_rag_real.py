import pytest
import httpx
import uuid
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue

OLLAMA_URL = "http://localhost:11434"
QDRANT_URL = "http://localhost:6333"
EMBED_MODEL = "nomic-embed-text"
TEST_COLLECTION = f"test_rag_{uuid.uuid4().hex[:8]}"

async def embed(text):
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(f"{OLLAMA_URL}/api/embeddings", json={"model": EMBED_MODEL, "prompt": text})
        r.raise_for_status()
        return r.json()["embedding"]

def search(client, collection, vector, tenant_id, limit):
    results = client.query_points(
        collection_name=collection,
        query=vector,
        query_filter=Filter(must=[FieldCondition(key="tenant_id", match=MatchValue(value=tenant_id))]),
        limit=limit,
    )
    return results.points

@pytest.fixture(scope="module")
def qdrant():
    client = QdrantClient(url=QDRANT_URL, timeout=10)
    client.get_collections()
    return client

@pytest.fixture(scope="module", autouse=True)
def check_ollama():
    r = httpx.get(f"{OLLAMA_URL}/api/tags", timeout=5.0)
    assert r.status_code == 200

@pytest.fixture(scope="module")
def collection(qdrant):
    import asyncio
    dim = len(asyncio.get_event_loop().run_until_complete(embed("test")))
    if qdrant.collection_exists(TEST_COLLECTION):
        qdrant.delete_collection(TEST_COLLECTION)
    qdrant.create_collection(collection_name=TEST_COLLECTION, vectors_config=VectorParams(size=dim, distance=Distance.COSINE))
    yield TEST_COLLECTION
    qdrant.delete_collection(TEST_COLLECTION)

@pytest.mark.asyncio
async def test_upsert_and_search_tenant_a(qdrant, collection):
    docs = ["Empresa Alpha: software de gestion contable para PyMEs", "Empresa Beta: plataforma e-commerce", "Empresa Gamma: consultoria SAP"]
    points = [PointStruct(id=i, vector=await embed(t), payload={"tenant_id": "tenant_A", "text": t}) for i, t in enumerate(docs)]
    qdrant.upsert(collection_name=collection, points=points)
    results = search(qdrant, collection, await embed("software contable para empresas"), "tenant_A", 3)
    assert len(results) > 0

@pytest.mark.asyncio
async def test_tenant_isolation(qdrant, collection):
    vec = await embed("Empresa Delta: marketing digital")
    qdrant.upsert(collection_name=collection, points=[PointStruct(id=100, vector=vec, payload={"tenant_id": "tenant_B", "text": "Delta"})])
    results = search(qdrant, collection, await embed("software contable"), "tenant_B", 10)
    for r in results:
        assert r.payload["tenant_id"] == "tenant_B"

@pytest.mark.asyncio
async def test_semantic_relevance(qdrant, collection):
    texts = {200: "fintech Rosario busca CRM", 201: "clinica odontologica software turnos", 202: "logistica GPS tracking"}
    for pid, text in texts.items():
        qdrant.upsert(collection_name=collection, points=[PointStruct(id=pid, vector=await embed(text), payload={"tenant_id": "tenant_C", "id": pid})])
    results = search(qdrant, collection, await embed("CRM para empresa de tecnologia"), "tenant_C", 3)
    assert len(results) >= 1
    assert results[0].payload["id"] != 201
