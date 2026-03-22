"""Qdrant client helpers for shared multi-tenant vector lookup."""

import asyncio
import os
import re
from functools import lru_cache
from typing import Any, Dict, List, Sequence

from qdrant_client import QdrantClient
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = os.getenv("QDRANT_PORT", "6333")
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_PREFIX = os.getenv("QDRANT_COLLECTION_PREFIX", "tenant")


def _normalize_tenant_id(tenant_id: str) -> str:
    """Turn tenant ids into qdrant-friendly collection names."""
    normalized = re.sub(r"[^a-z0-9]", "_", tenant_id.lower().strip())
    normalized = re.sub(r"_+", "_", normalized)
    normalized = normalized.strip("_")
    if not normalized:
        normalized = "default"
    return f"{COLLECTION_PREFIX}_{normalized}"


def _build_client() -> QdrantClient:
    url = QDRANT_URL or f"http://{QDRANT_HOST}:{QDRANT_PORT}"
    kwargs = {"url": url, "prefer_grpc": False}
    if QDRANT_API_KEY:
        kwargs["api_key"] = QDRANT_API_KEY
    return QdrantClient(**kwargs)


@lru_cache(maxsize=1)
def _get_client() -> QdrantClient:
    return _build_client()


def _serialize_payload(payload: Any) -> Dict[str, Any]:
    if isinstance(payload, dict):
        return payload
    if hasattr(payload, "__dict__"):
        return {k: v for k, v in payload.__dict__.items() if not k.startswith("_")}
    return {}


async def tenant_scoped_search(
    tenant_id: str,
    vector: Sequence[float],
    limit: int = 5,
    min_score: float = 0.0,
) -> List[Dict[str, Any]]:
    """Search qdrant collections isolated per tenant."""
    if not tenant_id or not vector:
        return []

    collection_name = _normalize_tenant_id(tenant_id)
    client = _get_client()
    payload: List[Dict[str, Any]] = []

    try:
        results = await asyncio.to_thread(
            client.search,
            collection_name=collection_name,
            query_vector=list(vector),
            limit=limit,
            with_payload=True,
            with_vectors=False,
            score_threshold=min_score or None,
        )
    except Exception as exc:  # pragma: no cover - best we can do is fallback
        print(f"[qdrant] tenant search failed for {tenant_id}: {exc}")
        return []

    for point in results:
        payload_data = _serialize_payload(point.payload)
        payload.append({
            "id": str(point.id),
            "score": float(point.score or 0.0),
            "text": payload_data.get("text") or payload_data.get("content") or "",
            "source": payload_data.get("source") or payload_data.get("url"),
            "metadata": payload_data.get("metadata") or payload_data,
        })

    return payload
