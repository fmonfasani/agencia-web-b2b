"""
Real integration tests for Ollama embeddings.
Requires Ollama running at http://localhost:11434
Run: pytest test_embeddings.py -v
"""
import pytest
import httpx
import asyncio

OLLAMA_URL = "http://localhost:11434"
EMBED_MODEL = "nomic-embed-text"  # cambiar si usás otro modelo


@pytest.fixture(scope="session", autouse=True)
def check_ollama():
    """Falla rápido si Ollama no está corriendo."""
    try:
        r = httpx.get(f"{OLLAMA_URL}/api/tags", timeout=5.0)
        assert r.status_code == 200, f"Ollama respondió {r.status_code}"
    except Exception as e:
        pytest.fail(f"Ollama no disponible en {OLLAMA_URL}: {e}")


async def embed(text: str) -> list[float]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(
            f"{OLLAMA_URL}/api/embeddings",
            json={"model": EMBED_MODEL, "prompt": text},
        )
        r.raise_for_status()
        return r.json()["embedding"]


@pytest.mark.asyncio
async def test_embedding_returns_list():
    result = await embed("hola mundo")
    assert isinstance(result, list)
    assert len(result) > 0


@pytest.mark.asyncio
async def test_embedding_dimension_consistent():
    e1 = await embed("texto uno")
    e2 = await embed("texto dos")
    assert len(e1) == len(e2), "Dimensiones inconsistentes entre llamadas"


@pytest.mark.asyncio
async def test_embedding_not_all_zeros():
    result = await embed("agente de IA para leads B2B")
    assert any(v != 0.0 for v in result), "Embedding todo ceros"


@pytest.mark.asyncio
async def test_embedding_deterministic():
    text = "tenant isolation test"
    e1 = await embed(text)
    e2 = await embed(text)
    # Ollama puede tener pequeñas variaciones con sampling, verificamos similitud alta
    dot = sum(a * b for a, b in zip(e1, e2))
    norm1 = sum(a ** 2 for a in e1) ** 0.5
    norm2 = sum(b ** 2 for b in e2) ** 0.5
    cosine = dot / (norm1 * norm2 + 1e-9)
    assert cosine > 0.99, f"Embeddings del mismo texto muy diferentes: cosine={cosine:.4f}"


@pytest.mark.asyncio
async def test_different_texts_produce_different_embeddings():
    e1 = await embed("empresa de software en Buenos Aires")
    e2 = await embed("restaurante de comida japonesa en Tokio")
    dot = sum(a * b for a, b in zip(e1, e2))
    norm1 = sum(a ** 2 for a in e1) ** 0.5
    norm2 = sum(b ** 2 for b in e2) ** 0.5
    cosine = dot / (norm1 * norm2 + 1e-9)
    assert cosine < 0.99, "Textos diferentes producen embeddings idénticos"
