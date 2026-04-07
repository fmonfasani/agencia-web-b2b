"""
Training Ingest Router — Backend Agents
Endpoint interno llamado por backend-saas para chunkear, embeddear e ingestar en Qdrant.
No requiere autenticación de usuario — es llamado service-to-service.
"""
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .training_ingest_service import ingest_document

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/training", tags=["training-ingest"])


class IngestPayload(BaseModel):
    document_id: str
    tenant_id: str
    content: str
    filename: str
    metadata: Optional[dict] = None
    chunk_config: Optional[dict] = None


@router.get("/qdrant-stats")
async def qdrant_stats():
    """Estadísticas de colecciones Qdrant para Observabilidad."""
    import asyncio
    from .qdrant.client import _get_client
    try:
        client = _get_client()
        collections_info = await asyncio.to_thread(client.get_collections)
        stats = []
        for col in collections_info.collections:
            try:
                info = await asyncio.to_thread(client.get_collection, col.name)
                stats.append({
                    "collection": col.name,
                    "vectors_count": info.vectors_count or 0,
                    "indexed_vectors": info.indexed_vectors_count or 0,
                    "points_count": info.points_count or 0,
                    "status": str(info.status),
                })
            except Exception:
                stats.append({"collection": col.name, "vectors_count": 0, "status": "unknown"})
        return {"collections": stats, "total_collections": len(stats)}
    except Exception as e:
        logger.error("qdrant-stats failed: %s", e)
        raise HTTPException(500, f"Error consultando Qdrant: {e}")


@router.post("/ingest")
async def ingest(payload: IngestPayload):
    """
    Recibe contenido procesado de backend-saas y:
    1. Chunkea según chunk_config (strategy: hybrid|fixed, chunk_size, overlap)
    2. Genera embeddings via Ollama (nomic-embed-text)
    3. Upsert en Qdrant colección tenant_{tenant_id}

    Retorna:
    {
        "chunks_stored": int,
        "vectors_stored": int,
        "chunks": [{chunk_id, index, content, token_count, vector_id, metadata}],
        "model": str,
        "collection": str,
    }
    """
    if not payload.content.strip():
        raise HTTPException(422, "El contenido está vacío")

    try:
        result = await ingest_document(
            document_id=payload.document_id,
            tenant_id=payload.tenant_id,
            content=payload.content,
            filename=payload.filename,
            metadata=payload.metadata or {},
            chunk_config=payload.chunk_config,
        )
        return result
    except Exception as e:
        logger.error("Ingest failed for doc=%s: %s", payload.document_id, e)
        raise HTTPException(500, f"Error en ingesta: {e}")
