import math
from typing import List, Dict

def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Simple cosine similarity without numpy"""
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a)) + 1e-6
    norm_b = math.sqrt(sum(x * x for x in b)) + 1e-6
    return dot / (norm_a * norm_b)

class InMemoryVectorStore:
    def __init__(self):
        self.collections = {}

    def upsert(self, tenant_id: str, chunks: List[Dict]):
        coll = self.collections.setdefault(tenant_id, [])
        for c in chunks:
            coll.append({
                "id": c.get("chunk_id"),
                "text": c.get("text"),
                "embedding": c.get("embedding")
            })

    def search(self, tenant_id: str, query: str, topk: int = 5):
        from app.embedding_utils import text_to_embedding
        vec_q = text_to_embedding(query)
        items = self.collections.get(tenant_id, [])
        def score(item):
            v = item["embedding"] or text_to_embedding(item["text"])
            return cosine_similarity(vec_q, v)
        scored = [(score(it), it) for it in items]
        scored.sort(key=lambda x: x[0], reverse=True)
        return [it for _, it in scored[:topk]]

# Simple registry usage
store = InMemoryVectorStore()
