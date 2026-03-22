import math
from typing import List, Dict, Any
from app.embedding_utils import text_to_embedding

def cosine_similarity(a: List[float], b: List[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = (sum(x*x for x in a) ** 0.5) or 1.0
    nb = (sum(x*x for x in b) ** 0.5) or 1.0
    return dot / (na * nb)

class InMemoryVectorStore:
    def __init__(self):
        self.collections: Dict[str, List[Dict[str, Any]]] = {}

    def upsert(self, tenant_id: str, chunks: List[Dict[str, Any]]):
        coll = self.collections.setdefault(tenant_id, [])
        for c in chunks:
            coll.append({
                "id": c.get("chunk_id"),
                "text": c.get("text"),
                "embedding": c.get("embedding"),
                "source": c.get("source" ),
                "payload": c.get("payload", {})
            })

    async def search(self, tenant_id: str, query: str, topk: int = 5):
        # async to align with async embeddings
        vec_q = await text_to_embedding(query)
        items = self.collections.get(tenant_id, [])
        scored = []
        for it in items:
            emb = it.get("embedding")
            if emb is None:
                emb = await text_to_embedding(it.get("text", ""))
            score = cosine_similarity(vec_q, emb)
            scored.append((score, it))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [it for _, it in scored[:topk]]

# Expose a global store for easy reuse in tests/fixtures
store = InMemoryVectorStore()
