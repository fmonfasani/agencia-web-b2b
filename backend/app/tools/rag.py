import math
from typing import List, Dict
from ..embedding_utils import text_to_embedding

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
        import numpy as np
        vec_q = text_to_embedding(query)
        items = self.collections.get(tenant_id, [])
        def score(item):
            v = item["embedding"] or text_to_embedding(item["text"])
            # cosine similarity with small vectors
            a = np.array(vec_q)
            b = np.array(v)
            na = (a / (np.linalg.norm(a) + 1e-6))
            nb = (b / (np.linalg.norm(b) + 1e-6))
            return float(np.dot(na, nb))
        scored = [(score(it), it) for it in items]
        scored.sort(key=lambda x: x[0], reverse=True)
        return [it for _, it in scored[:topk]]

# Simple registry usage
store = InMemoryVectorStore()
