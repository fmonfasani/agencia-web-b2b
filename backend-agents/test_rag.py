"""
tests/test_rag.py

Unit tests for app.tools.rag.search().
All external dependencies (Qdrant, Ollama) are mocked.
"""
import logging
import pytest
from unittest.mock import AsyncMock, patch

from app.tools.rag import search, InMemoryVectorStore

FAKE_VECTOR = [0.1] * 768
FAKE_META = {}


@pytest.mark.asyncio
async def test_search_returns_qdrant_results():
    """search() returns results from tenant_scoped_search with correct structure."""
    qdrant_rows = [
        {"id": "abc", "score": 0.91, "text": "coberturas básicas", "source": "manual.pdf"},
        {"id": "def", "score": 0.75, "text": "coberturas ampliadas", "source": "manual.pdf"},
    ]
    with patch("app.tools.rag.text_to_embedding", new=AsyncMock(return_value=(FAKE_VECTOR, FAKE_META))), \
         patch("app.tools.rag.tenant_scoped_search", new=AsyncMock(return_value=qdrant_rows)):
        result = await search("tenant_abc", "coberturas")

    assert result["results"] == qdrant_rows
    assert result["meta"]["results_count"] == 2


def test_search_meta_source_is_qdrant():
    """meta.source must always be 'qdrant'."""
    import asyncio
    with patch("app.tools.rag.text_to_embedding", new=AsyncMock(return_value=(FAKE_VECTOR, FAKE_META))), \
         patch("app.tools.rag.tenant_scoped_search", new=AsyncMock(return_value=[])):
        result = asyncio.get_event_loop().run_until_complete(search("t1", "query"))

    assert result["meta"]["source"] == "qdrant"


@pytest.mark.asyncio
async def test_search_meta_fields_populated():
    """meta contains all required observability fields."""
    with patch("app.tools.rag.text_to_embedding", new=AsyncMock(return_value=(FAKE_VECTOR, FAKE_META))), \
         patch("app.tools.rag.tenant_scoped_search", new=AsyncMock(return_value=[])):
        result = await search("tenant_x", "test query", topk=3, min_score=0.5)

    meta = result["meta"]
    assert meta["tenant_id"] == "tenant_x"
    assert meta["query"] == "test query"
    assert meta["results_count"] == 0
    assert meta["min_score"] == 0.5
    assert meta["top_score"] is None
    assert meta["source"] == "qdrant"
    assert isinstance(meta["latency_ms"], int)
    assert meta["latency_ms"] >= 0


@pytest.mark.asyncio
async def test_search_top_score_from_first_result():
    """meta.top_score equals the score of the first (highest) result."""
    rows = [{"id": "1", "score": 0.88, "text": "x", "source": "s"}]
    with patch("app.tools.rag.text_to_embedding", new=AsyncMock(return_value=(FAKE_VECTOR, FAKE_META))), \
         patch("app.tools.rag.tenant_scoped_search", new=AsyncMock(return_value=rows)):
        result = await search("t", "q")

    assert result["meta"]["top_score"] == 0.88


@pytest.mark.asyncio
async def test_search_logs_warning_when_no_results(caplog):
    """search() logs a WARNING when Qdrant returns empty results."""
    with patch("app.tools.rag.text_to_embedding", new=AsyncMock(return_value=(FAKE_VECTOR, FAKE_META))), \
         patch("app.tools.rag.tenant_scoped_search", new=AsyncMock(return_value=[])):
        with caplog.at_level(logging.WARNING, logger="app.tools.rag"):
            await search("tenant_empty", "nothing here")

    assert any("no results" in r.message.lower() for r in caplog.records)


@pytest.mark.asyncio
async def test_search_returns_empty_on_qdrant_failure():
    """On Qdrant exception, search() never raises — returns empty results with error in meta."""
    with patch("app.tools.rag.text_to_embedding", new=AsyncMock(return_value=(FAKE_VECTOR, FAKE_META))), \
         patch("app.tools.rag.tenant_scoped_search", new=AsyncMock(side_effect=RuntimeError("connection refused"))):
        result = await search("tenant_broken", "query")

    assert result["results"] == []
    assert result["meta"]["results_count"] == 0
    assert "error" in result["meta"]
    assert "connection refused" in result["meta"]["error"]
    assert result["meta"]["source"] == "qdrant"


@pytest.mark.asyncio
async def test_search_returns_empty_on_embedding_failure():
    """On embedding exception, search() never raises — returns empty results with error in meta."""
    with patch("app.tools.rag.text_to_embedding", new=AsyncMock(side_effect=RuntimeError("ollama down"))):
        result = await search("tenant_broken", "query")

    assert result["results"] == []
    assert "error" in result["meta"]
    assert "ollama down" in result["meta"]["error"]


@pytest.mark.asyncio
async def test_search_tenant_isolation_via_qdrant_call():
    """tenant_scoped_search is called with the exact tenant_id passed to search()."""
    mock_search = AsyncMock(return_value=[])
    with patch("app.tools.rag.text_to_embedding", new=AsyncMock(return_value=(FAKE_VECTOR, FAKE_META))), \
         patch("app.tools.rag.tenant_scoped_search", new=mock_search):
        await search("tenant_specific_123", "query", topk=7, min_score=0.4)

    mock_search.assert_called_once()
    call_kwargs = mock_search.call_args
    # First positional arg is tenant_id
    assert call_kwargs[0][0] == "tenant_specific_123"
    assert call_kwargs[1].get("limit") == 7 or call_kwargs[0][2] == 7
    assert call_kwargs[1].get("min_score") == 0.4 or call_kwargs[0][3] == 0.4


# ---------------------------------------------------------------------------
# InMemoryVectorStore deprecation tests
# ---------------------------------------------------------------------------

def test_inmemory_store_raises_deprecation_warning():
    """Instantiating InMemoryVectorStore emits DeprecationWarning."""
    with pytest.warns(DeprecationWarning, match="deprecated"):
        InMemoryVectorStore()


@pytest.mark.asyncio
async def test_inmemory_store_search_returns_empty():
    """Deprecated store always returns empty list (no-op)."""
    with pytest.warns(DeprecationWarning):
        store = InMemoryVectorStore()
    result = await store.search("tenant", "query")
    assert result == []


def test_inmemory_store_upsert_is_noop():
    """Deprecated store upsert does nothing (no-op, no exception)."""
    with pytest.warns(DeprecationWarning):
        store = InMemoryVectorStore()
    store.upsert("tenant", [{"chunk_id": "1", "text": "x"}])
    assert store.collections == {}
