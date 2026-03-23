import time
from typing import Any, Dict, List

from app.embedding_utils import text_to_embedding
from app.qdrant.client import tenant_scoped_search


async def search_rag(
    tenant_id: str,
    query: str,
    topk: int = 5,
    min_score: float = 0.3,
) -> Dict[str, Any]:

    t0 = time.time()

    try:
        vector, _ = await text_to_embedding(query)

        results: List[Dict[str, Any]] = await tenant_scoped_search(
            tenant_id=tenant_id,
            vector=vector,
            limit=topk,
            min_score=min_score
        )

    except Exception as e:
        return {
            "results": [],
            "meta": {
                "tenant_id": tenant_id,
                "error": str(e)
            }
        }

    return {
        "results": results,
        "meta": {
            "tenant_id": tenant_id,
            "query": query,
            "results_count": len(results),
            "latency_ms": int((time.time() - t0) * 1000),
        },
    }