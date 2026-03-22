import pytest
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from app.tools.rag import InMemoryVectorStore
from app.embedding_utils import text_to_embedding

@pytest.mark.asyncio
async def test_vector_store_upsert(rag_store=None):
    """Test vector store can store chunks (async compatible)"""
    store = InMemoryVectorStore()
    chunks = [
        {"chunk_id": "1", "text": "First chunk content", "embedding": await text_to_embedding("First chunk content")},
        {"chunk_id": "2", "text": "Second chunk content", "embedding": await text_to_embedding("Second chunk content")}
    ]
    store.upsert("tenant_abc", chunks)
    assert "tenant_abc" in store.collections
    assert len(store.collections["tenant_abc"]) == 2

@pytest.mark.asyncio
async def test_vector_store_search():
    """Test vector store search returns relevant results"""
    store = InMemoryVectorStore()
    chunks = [
        {"chunk_id": "1", "text": "Python programming language", "embedding": await text_to_embedding("Python programming language")},
        {"chunk_id": "2", "text": "JavaScript framework React", "embedding": await text_to_embedding("JavaScript framework React")},
        {"chunk_id": "3", "text": "Python数据分析", "embedding": await text_to_embedding("Python数据分析")}
    ]
    store.upsert("tenant_xyz", chunks)
    results = await store.search("tenant_xyz", "Python", topk=2)
    assert len(results) <= 2
    texts = [r["text"] for r in results]
    assert any("Python" in t for t in texts)

@pytest.mark.asyncio
async def test_vector_store_tenant_isolation():
    """Test that tenants are isolated"""
    store = InMemoryVectorStore()
    store.upsert("tenant_a", [{"chunk_id": "1", "text": "secret data", "embedding": await text_to_embedding("secret data")}])
    store.upsert("tenant_b", [{"chunk_id": "2", "text": "other data", "embedding": await text_to_embedding("other data")}])
    results_a = await store.search("tenant_a", "secret", topk=1)
    assert len(results_a) == 1
    assert results_a[0]["text"] == "secret data"
    results_b = await store.search("tenant_b", "other", topk=1)
    assert len(results_b) == 1
    assert results_b[0]["text"] == "other data"
