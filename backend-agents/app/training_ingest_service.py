"""
Training Ingest Service — Backend Agents
Chunking (fixed/hybrid), embedding via Ollama, upsert en Qdrant con metadata completa.
"""
import re
import uuid
import asyncio
import logging
import os
from typing import Optional

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct, UpdateStatus
)

from .embedding_utils import text_to_embedding, EMBED_MODEL
from .qdrant.client import _normalize_tenant_id, _get_client

logger = logging.getLogger(__name__)

VECTOR_SIZE = int(os.getenv("EMBED_VECTOR_SIZE", "768"))
EMBEDDING_VERSION = "v1"


# ── Chunking ──────────────────────────────────────────────────────────────────

def chunk_fixed(text: str, chunk_size: int = 512, overlap: int = 64) -> list[str]:
    """
    Chunking por tamaño fijo de caracteres con overlap.
    Intenta no cortar palabras.
    """
    text = text.strip()
    if not text:
        return []

    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        if end < len(text):
            # Retroceder al último espacio para no cortar palabras
            cut = text.rfind(" ", start, end)
            if cut > start:
                end = cut
        chunks.append(text[start:end].strip())
        start = end - overlap
        if start < 0:
            start = 0

    return [c for c in chunks if c]


def chunk_hybrid(text: str, chunk_size: int = 512, overlap: int = 64) -> list[str]:
    """
    Chunking híbrido:
    1. Divide por párrafos (doble salto de línea o encabezados markdown)
    2. Si un párrafo supera chunk_size → aplica chunk_fixed sobre él
    3. Si es muy corto → lo une con el siguiente (greedy merge)
    """
    # Separar por párrafos
    paragraphs = re.split(r"\n{2,}|(?=#{1,3} )", text)
    paragraphs = [p.strip() for p in paragraphs if p.strip()]

    raw_chunks: list[str] = []
    for para in paragraphs:
        if len(para) > chunk_size:
            raw_chunks.extend(chunk_fixed(para, chunk_size, overlap))
        else:
            raw_chunks.append(para)

    # Greedy merge: unir chunks cortos con el siguiente
    MIN_SIZE = chunk_size // 4
    merged: list[str] = []
    buf = ""
    for chunk in raw_chunks:
        if not buf:
            buf = chunk
        elif len(buf) < MIN_SIZE:
            buf = buf + "\n\n" + chunk
        else:
            merged.append(buf)
            buf = chunk
    if buf:
        merged.append(buf)

    return [c for c in merged if c.strip()]


def make_chunks(
    text: str,
    strategy: str = "hybrid",
    chunk_size: int = 512,
    overlap: int = 64,
) -> list[str]:
    """Dispatch a la estrategia de chunking correcta."""
    if strategy == "fixed":
        return chunk_fixed(text, chunk_size, overlap)
    return chunk_hybrid(text, chunk_size, overlap)


# ── Qdrant collection helpers ─────────────────────────────────────────────────

def _ensure_collection(client: QdrantClient, collection_name: str):
    """Crea la colección si no existe (idempotente)."""
    existing = {c.name for c in client.get_collections().collections}
    if collection_name not in existing:
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(
                size=VECTOR_SIZE,
                distance=Distance.COSINE,
            ),
        )
        logger.info("Created Qdrant collection: %s", collection_name)


# ── Main ingest pipeline ──────────────────────────────────────────────────────

async def ingest_document(
    document_id: str,
    tenant_id: str,
    content: str,
    filename: str,
    metadata: dict,
    chunk_config: Optional[dict] = None,
) -> dict:
    """
    1. Chunkea el contenido según chunk_config
    2. Genera embeddings para cada chunk en paralelo (con semáforo para no saturar Ollama)
    3. Upsert en Qdrant con metadata completa
    4. Retorna resumen con lista de chunks enriquecidos

    chunk_config keys:
        strategy:   "hybrid" | "fixed"  (default: hybrid)
        chunk_size: int                  (default: 512)
        overlap:    int                  (default: 64)
    """
    cfg = chunk_config or {}
    strategy   = cfg.get("strategy", "hybrid")
    chunk_size = int(cfg.get("chunk_size", 512))
    overlap    = int(cfg.get("overlap", 64))

    # 1. Chunkear
    texts = make_chunks(content, strategy=strategy, chunk_size=chunk_size, overlap=overlap)
    if not texts:
        return {"chunks_stored": 0, "vectors_stored": 0, "chunks": [], "model": EMBED_MODEL}

    logger.info(
        "Ingesting doc=%s tenant=%s strategy=%s chunks=%d",
        document_id, tenant_id, strategy, len(texts),
    )

    # 2. Embeddings en paralelo (semáforo para no saturar Ollama)
    sem = asyncio.Semaphore(4)

    async def embed_one(text: str):
        async with sem:
            return await text_to_embedding(text)

    embedding_results = await asyncio.gather(*[embed_one(t) for t in texts])

    # 3. Preparar puntos para Qdrant
    collection_name = _normalize_tenant_id(tenant_id)
    client = _get_client()
    _ensure_collection(client, collection_name)

    points: list[PointStruct] = []
    chunk_records: list[dict] = []

    for idx, (text, (vector, emb_meta)) in enumerate(zip(texts, embedding_results)):
        chunk_id = str(uuid.uuid4())
        token_count = len(text.split())

        payload = {
            "text": text,
            "content": text,
            "source": filename,
            "document_id": document_id,
            "tenant_id": tenant_id,
            "chunk_index": idx,
            "chunk_id": chunk_id,
            "embedding_version": EMBEDDING_VERSION,
            "embedding_model": EMBED_MODEL,
            "had_fallback": emb_meta.get("had_embedding_fallback", False),
            "metadata": {
                **metadata,
                "chunk_strategy": strategy,
                "chunk_size": chunk_size,
                "token_count": token_count,
            },
        }

        points.append(PointStruct(id=chunk_id, vector=vector, payload=payload))
        chunk_records.append({
            "chunk_id": chunk_id,
            "index": idx,
            "content": text,
            "token_count": token_count,
            "vector_id": chunk_id,
            "metadata": payload["metadata"],
        })

    # 4. Upsert en Qdrant (batches de 100 para documentos grandes)
    vectors_stored = 0
    batch_size = 100
    for i in range(0, len(points), batch_size):
        batch = points[i : i + batch_size]
        result = await asyncio.to_thread(
            client.upsert,
            collection_name=collection_name,
            points=batch,
            wait=True,
        )
        if result.status == UpdateStatus.COMPLETED:
            vectors_stored += len(batch)
        else:
            logger.warning("Qdrant upsert batch %d status: %s", i // batch_size, result.status)

    logger.info(
        "Ingest complete: doc=%s chunks=%d vectors=%d",
        document_id, len(chunk_records), vectors_stored,
    )

    return {
        "chunks_stored": len(chunk_records),
        "vectors_stored": vectors_stored,
        "chunks": chunk_records,
        "model": EMBED_MODEL,
        "collection": collection_name,
    }
