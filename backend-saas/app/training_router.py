"""
Training Router — Backend SaaS
Endpoints para el módulo de entrenamiento production-grade.
"""
import os
import logging
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .training_service import (
    extract_text,
    create_document,
    get_documents_by_tenant,
    get_pending_documents,
    get_document_detail,
    update_document,
    reject_document,
    get_tenant_training_status,
    get_conn,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/training", tags=["training"])

AGENTS_URL = os.getenv("BACKEND_AGENTS_URL", os.getenv("AGENT_SERVICE_URL", "http://localhost:8001"))
ALLOWED_EXTENSIONS = {".pdf", ".txt", ".csv", ".docx"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


# ── Pydantic models ───────────────────────────────────────────────────────────

class UpdateDocumentRequest(BaseModel):
    content_processed: Optional[str] = None
    metadata: Optional[dict] = None
    chunk_config: Optional[dict] = None
    status: Optional[str] = None

class RejectRequest(BaseModel):
    reason: str

class IngestRequest(BaseModel):
    chunk_config: Optional[dict] = None  # override del chunk_config del doc


# ── Auth helper ───────────────────────────────────────────────────────────────

def get_api_key(request: Request) -> str:
    """Extrae API key del header X-API-Key."""
    api_key = request.headers.get("X-API-Key") or request.headers.get("x-api-key")
    if not api_key:
        raise HTTPException(status_code=401, detail="API key requerida")
    return api_key


# ── Cliente: subir documento ──────────────────────────────────────────────────

@router.post("/upload")
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    tenant_id: Optional[str] = Form(None),
):
    """
    Cliente sube un documento.
    Extrae el texto, calcula hash, guarda en DB, crea job de preprocesamiento.
    """
    from pathlib import Path
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Formato no permitido: {ext}. Permitidos: {', '.join(ALLOWED_EXTENSIONS)}")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(400, "Archivo demasiado grande (máx 20 MB)")

    # Resolver tenant_id desde API key si no se pasó
    if not tenant_id:
        api_key = get_api_key(request)
        tenant_id = await _resolve_tenant(api_key)

    raw_text = extract_text(content, file.filename)
    if not raw_text.strip():
        raise HTTPException(422, "No se pudo extraer texto del archivo")

    result = create_document(
        tenant_id=tenant_id,
        filename=file.filename,
        file_type=ext.lstrip("."),
        file_size=len(content),
        content_raw=raw_text,
    )

    return {
        "success": True,
        "document_id": result["id"],
        "status": result["status"],
        "quality_score": result.get("quality_score"),
        "quality_issues": result.get("quality_issues", []),
        "duplicate": result.get("duplicate", False),
    }


# ── Cliente: ver sus documentos ───────────────────────────────────────────────

@router.get("/documents")
async def list_my_documents(request: Request):
    """Cliente ve todos sus documentos con estado."""
    api_key = get_api_key(request)
    tenant_id = await _resolve_tenant(api_key)
    docs = get_documents_by_tenant(tenant_id)
    return {"documents": docs, "total": len(docs)}


# ── Cliente: estado de entrenamiento ─────────────────────────────────────────

@router.get("/status/{tenant_id}")
async def training_status(tenant_id: str):
    """Estado agregado de entrenamiento de un tenant."""
    return get_tenant_training_status(tenant_id)


# ── Analista: ver todos los pendientes ───────────────────────────────────────

@router.get("/pending")
async def pending_documents():
    """Cross-tenant: todos los docs que no están ingestados/rechazados."""
    docs = get_pending_documents()
    return {"documents": docs, "total": len(docs)}


@router.get("/all")
async def all_documents():
    """Cross-tenant: todos los documentos sin filtro (para panel admin)."""
    from .training_service import get_all_documents
    docs = get_all_documents()
    return {"documents": docs, "total": len(docs)}


@router.get("/metrics")
async def training_metrics():
    """Métricas agregadas de entrenamiento para Observabilidad."""
    from .training_service import get_training_metrics
    return get_training_metrics()


@router.get("/qdrant-stats")
async def qdrant_stats():
    """Proxy a backend-agents para stats de Qdrant."""
    import httpx
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{AGENTS_URL}/training/qdrant-stats")
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        logger.warning("Could not fetch qdrant-stats: %s", e)
        return {"collections": [], "total_collections": 0, "error": str(e)}


# ── Analista: detalle de un documento ────────────────────────────────────────

@router.get("/documents/{doc_id}")
async def document_detail(doc_id: str):
    doc = get_document_detail(doc_id)
    if not doc:
        raise HTTPException(404, "Documento no encontrado")
    return doc


# ── Analista: editar contenido + metadata + chunk config ─────────────────────

@router.patch("/documents/{doc_id}")
async def update_doc(doc_id: str, body: UpdateDocumentRequest, request=None):
    """Analista edita el contenido procesado, metadata y configuración de chunking."""
    doc = get_document_detail(doc_id)
    if not doc:
        raise HTTPException(404, "Documento no encontrado")
    if doc["status"] == "ingested":
        raise HTTPException(400, "No se puede editar un documento ya ingestado")

    new_status = body.status
    if body.content_processed is not None and new_status is None:
        new_status = "reviewing"

    update_document(
        doc_id,
        content_processed=body.content_processed,
        metadata=body.metadata,
        chunk_config=body.chunk_config,
        status=new_status,
    )
    return {"success": True, "doc_id": doc_id}


# ── Analista: disparar ingesta ────────────────────────────────────────────────

@router.post("/documents/{doc_id}/ingest")
async def ingest_document(doc_id: str, body: IngestRequest = IngestRequest()):
    """
    Analista aprueba e ingesta. Llama al backend-agents para:
    1. Chunkear el content_processed
    2. Generar embeddings
    3. Upsert en Qdrant con metadata correcta
    """
    import httpx

    doc = get_document_detail(doc_id)
    if not doc:
        raise HTTPException(404, "Documento no encontrado")
    if doc["status"] == "ingested":
        return {"success": True, "message": "Ya ingestado", "doc_id": doc_id}
    if doc["quality_score"] is not None and doc["quality_score"] < 0.4:
        raise HTTPException(
            422,
            f"Quality score demasiado bajo ({doc['quality_score']}). "
            "El analista debe mejorar el contenido antes de ingestar."
        )

    content = doc.get("content_processed") or doc.get("content_raw") or ""
    if not content.strip():
        raise HTTPException(422, "El documento no tiene contenido para ingestar")

    chunk_cfg = body.chunk_config or doc.get("chunk_config") or {}

    # Marcar como embedding
    update_document(doc_id, status="embedding")

    # Llamar al backend-agents para ingestión real
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{AGENTS_URL}/training/ingest",
                json={
                    "document_id": doc_id,
                    "tenant_id": doc["tenant_id"],
                    "content": content,
                    "filename": doc["filename"],
                    "metadata": doc.get("metadata", {}),
                    "chunk_config": chunk_cfg,
                },
            )
            resp.raise_for_status()
            result = resp.json()
    except Exception as e:
        update_document(doc_id, status="failed")
        logger.error("Ingest call failed for %s: %s", doc_id, e)
        raise HTTPException(502, f"Error al llamar al servicio de ingesta: {e}")

    # Actualizar estado final
    update_document(doc_id, status="ingested")

    # Guardar chunks y embeddings en DB
    _save_ingest_result(doc_id, doc["tenant_id"], result)

    return {
        "success": True,
        "doc_id": doc_id,
        "chunks": result.get("chunks_stored", 0),
        "vectors": result.get("vectors_stored", 0),
    }


# ── Analista: rechazar ────────────────────────────────────────────────────────

@router.post("/documents/{doc_id}/reject")
async def reject_doc(doc_id: str, body: RejectRequest):
    doc = get_document_detail(doc_id)
    if not doc:
        raise HTTPException(404, "Documento no encontrado")
    reject_document(doc_id, body.reason)
    return {"success": True, "doc_id": doc_id}


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _resolve_tenant(api_key: str) -> str:
    """Resuelve tenant_id a partir de API key via DB."""
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'SELECT "defaultTenantId" FROM "User" WHERE "apiKey"=%s AND status=\'ACTIVE\' LIMIT 1',
                    (api_key,),
                )
                row = cur.fetchone()
                if row and row[0]:
                    return str(row[0])
    except Exception as e:
        logger.error("Could not resolve tenant: %s", e)
    raise HTTPException(401, "No se pudo resolver el tenant para esta API key")


def _save_ingest_result(doc_id: str, tenant_id: str, result: dict):
    """Guarda chunks y embeddings retornados por backend-agents."""
    import psycopg2, json, uuid, os
    chunks = result.get("chunks", [])
    if not chunks:
        return
    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/agencia_web_b2b")
    try:
        with psycopg2.connect(db_url) as conn:
            with conn.cursor() as cur:
                for ch in chunks:
                    chunk_id = ch.get("chunk_id") or str(uuid.uuid4())
                    cur.execute(
                        """
                        INSERT INTO training_chunks (id, document_id, tenant_id, chunk_index, content, token_count, char_count, metadata)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                        ON CONFLICT (id) DO NOTHING
                        """,
                        (chunk_id, doc_id, tenant_id,
                         ch.get("index", 0), ch.get("content", ""),
                         ch.get("token_count", 0), len(ch.get("content", "")),
                         json.dumps(ch.get("metadata", {}))),
                    )
                    if ch.get("vector_id"):
                        emb_id = str(uuid.uuid4())
                        cur.execute(
                            """
                            INSERT INTO training_embeddings (id, chunk_id, document_id, tenant_id, vector_id, embedding_model)
                            VALUES (%s,%s,%s,%s,%s,%s)
                            """,
                            (emb_id, chunk_id, doc_id, tenant_id,
                             ch["vector_id"], result.get("model", "nomic-embed-text")),
                        )
            conn.commit()
    except Exception as e:
        logger.error("Could not save ingest result: %s", e)
