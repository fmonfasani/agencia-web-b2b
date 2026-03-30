"""
app/tools/rag.py

Module-level search() function backed by Qdrant per-tenant collections.
"""
import logging
import time
import warnings
from typing import Any, Dict, List, Optional

from app.embedding_utils import text_to_embedding
from app.qdrant.client import tenant_scoped_search

logger = logging.getLogger(__name__)

_DEFAULT_MIN_SCORE = 0.3


async def search(
    tenant_id: str,
    query: str,
    topk: int = 5,
    min_score: float = _DEFAULT_MIN_SCORE,
) -> Dict[str, Any]:
    """
    Search Qdrant for relevant chunks for a given tenant and query.

    Returns:
        {
            "results": list[dict],   # each has: id, score, text, source
            "meta": {
                "tenant_id": str,
                "query": str,
                "results_count": int,
                "latency_ms": int,
                "min_score": float,
                "top_score": float | None,
                "source": "qdrant",
            }
        }

    Never raises — on failure returns empty results with "error" key in meta.
    """
    logger.info(
        "[RAG] search started",
        extra={"tenant_id": tenant_id, "query": query[:100], "topk": topk},
    )
    t0 = time.time()

    try:
        vector, _ = await text_to_embedding(query)
        results: List[Dict[str, Any]] = await tenant_scoped_search(
            tenant_id, vector, limit=topk, min_score=min_score
        )
    except Exception as e:
        latency_ms = int((time.time() - t0) * 1000)
        logger.error(
            "[RAG] search failed",
            extra={"tenant_id": tenant_id, "error": str(e)},
        )
        return {
            "results": [],
            "meta": {
                "tenant_id": tenant_id,
                "query": query,
                "results_count": 0,
                "latency_ms": latency_ms,
                "min_score": min_score,
                "top_score": None,
                "source": "qdrant",
                "error": str(e),
            },
        }

    latency_ms = int((time.time() - t0) * 1000)

    if results:
        logger.info(
            "[RAG] search completed",
            extra={
                "tenant_id": tenant_id,
                "results_count": len(results),
                "latency_ms": latency_ms,
            },
        )
    else:
        logger.warning(
            "[RAG] no results found",
            extra={"tenant_id": tenant_id, "query": query[:100]},
        )

    return {
        "results": results,
        "meta": {
            "tenant_id": tenant_id,
            "query": query,
            "results_count": len(results),
            "latency_ms": latency_ms,
            "min_score": min_score,
            "top_score": results[0]["score"] if results else None,
            "source": "qdrant",
        },
    }


class InMemoryVectorStore:
    """
    Deprecated. Was an in-memory vector store used in unit tests before Qdrant integration.
    Kept as a no-op to avoid ImportError in code that still references it.
    Use app.tools.rag.search() for real RAG search.
    """

    def __init__(self):
        warnings.warn(
            "InMemoryVectorStore is deprecated. Use app.tools.rag.search() instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        self.collections: Dict[str, list] = {}

    def upsert(self, *args: Any, **kwargs: Any) -> None:
        pass

    async def search(self, *args: Any, **kwargs: Any) -> List[Dict[str, Any]]:
        return []


# Kept to avoid AttributeError on `from app.tools.rag import store`
store: Optional[InMemoryVectorStore] = None
