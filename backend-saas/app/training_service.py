"""
Training Service — Backend SaaS
Maneja upload, extracción de texto, quality scoring e idempotencia.
"""
import hashlib
import re
import uuid
import os
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional

import psycopg2

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/agencia_web_b2b")
UPLOAD_DIR   = Path(os.getenv("UPLOAD_DIR", "/tmp/uploads"))


# ── DB helpers ────────────────────────────────────────────────────────────────

def get_conn():
    return psycopg2.connect(DATABASE_URL)


def ensure_tables():
    """Crea las tablas si no existen (idempotente)."""
    sql_path = Path(__file__).parent.parent / "migrations" / "training_tables.sql"
    if not sql_path.exists():
        logger.warning("Migration file not found: %s", sql_path)
        return
    sql = sql_path.read_text()
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()


# ── Text extraction ───────────────────────────────────────────────────────────

def extract_text(file_bytes: bytes, filename: str) -> str:
    ext = Path(filename).suffix.lower()

    if ext == ".txt":
        return file_bytes.decode("utf-8", errors="replace")

    if ext == ".pdf":
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            return "\n".join(page.get_text() for page in doc)
        except Exception as e:
            logger.error("PDF extraction failed: %s", e)
            return ""

    if ext == ".docx":
        try:
            import docx
            import io
            doc = docx.Document(io.BytesIO(file_bytes))
            return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        except Exception as e:
            logger.error("DOCX extraction failed: %s", e)
            return ""

    if ext == ".csv":
        try:
            import pandas as pd
            import io
            df = pd.read_csv(io.BytesIO(file_bytes))
            return df.to_string(index=False)
        except Exception as e:
            logger.error("CSV extraction failed: %s", e)
            return file_bytes.decode("utf-8", errors="replace")

    # Fallback
    return file_bytes.decode("utf-8", errors="replace")


# ── Quality scoring ───────────────────────────────────────────────────────────

def quality_score(text: str) -> tuple[float, list[str]]:
    """
    Retorna (score 0.0-1.0, lista de problemas).
    < 0.4 → bloquear ingesta
    < 0.6 → warning analista
    """
    issues = []
    score = 1.0

    if not text or len(text.strip()) < 50:
        return 0.0, ["contenido vacío o muy corto"]

    # Ratio alfanumérico (ruido OCR)
    alphanum = sum(c.isalnum() or c.isspace() for c in text)
    ratio = alphanum / len(text)
    if ratio < 0.6:
        issues.append("posible ruido OCR")
        score -= 0.25

    # Repetición excesiva de líneas
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    if lines:
        unique_ratio = len(set(lines)) / len(lines)
        if unique_ratio < 0.5:
            issues.append("repetición excesiva de contenido")
            score -= 0.2

    # Longitud mínima
    word_count = len(text.split())
    if word_count < 30:
        issues.append("texto muy corto (< 30 palabras)")
        score -= 0.15

    # Estructura pobre (todo en una línea)
    if len(lines) < 3 and word_count > 100:
        issues.append("estructura pobre (sin saltos de línea)")
        score -= 0.1

    return max(0.0, round(score, 2)), issues


# ── Document hash ─────────────────────────────────────────────────────────────

def compute_hash(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


# ── CRUD ──────────────────────────────────────────────────────────────────────

def create_document(
    tenant_id: str,
    filename: str,
    file_type: str,
    file_size: int,
    content_raw: str,
    uploaded_by: Optional[str] = None,
) -> dict:
    doc_hash = compute_hash(content_raw)
    score, issues = quality_score(content_raw)

    # Idempotencia: si ya existe el mismo hash para este tenant, retornar el existente
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, status FROM training_documents WHERE tenant_id=%s AND document_hash=%s LIMIT 1",
                (tenant_id, doc_hash),
            )
            existing = cur.fetchone()
            if existing:
                return {"id": str(existing[0]), "status": existing[1], "duplicate": True}

            doc_id = str(uuid.uuid4())
            cur.execute(
                """
                INSERT INTO training_documents
                  (id, tenant_id, filename, file_type, file_size_bytes, content_raw,
                   document_hash, status, quality_score, quality_issues, uploaded_by)
                VALUES (%s,%s,%s,%s,%s,%s,%s,'uploaded',%s,%s,%s)
                """,
                (doc_id, tenant_id, filename, file_type, file_size, content_raw,
                 doc_hash, score, str(issues), uploaded_by),
            )
            # Job de preprocesamiento
            job_id = str(uuid.uuid4())
            cur.execute(
                "INSERT INTO training_jobs (id, document_id, tenant_id, job_type) VALUES (%s,%s,%s,'preprocess')",
                (job_id, doc_id, tenant_id),
            )
        conn.commit()

    return {"id": doc_id, "status": "uploaded", "quality_score": score, "quality_issues": issues, "duplicate": False}


def get_documents_by_tenant(tenant_id: str) -> list[dict]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, filename, file_type, file_size_bytes, status,
                       quality_score, quality_issues, metadata, chunk_config,
                       rejection_reason, uploaded_at, processed_at, ingested_at
                FROM training_documents
                WHERE tenant_id=%s
                ORDER BY uploaded_at DESC
                """,
                (tenant_id,),
            )
            rows = cur.fetchall()

    return [
        {
            "id": str(r[0]), "filename": r[1], "file_type": r[2],
            "file_size_bytes": r[3], "status": r[4],
            "quality_score": r[5], "quality_issues": r[6] or [],
            "metadata": r[7] or {}, "chunk_config": r[8] or {},
            "rejection_reason": r[9],
            "uploaded_at": r[10].isoformat() if r[10] else None,
            "processed_at": r[11].isoformat() if r[11] else None,
            "ingested_at": r[12].isoformat() if r[12] else None,
        }
        for r in rows
    ]


def get_pending_documents() -> list[dict]:
    """Todos los docs pendientes de revisión (cross-tenant) para analistas."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT d.id, d.tenant_id, d.filename, d.file_type, d.file_size_bytes,
                       d.status, d.quality_score, d.quality_issues, d.metadata,
                       d.uploaded_at,
                       (SELECT COUNT(*) FROM training_chunks c WHERE c.document_id=d.id) AS chunk_count
                FROM training_documents d
                WHERE d.status NOT IN ('ingested','rejected')
                ORDER BY d.uploaded_at DESC
                """,
            )
            rows = cur.fetchall()

    return [
        {
            "id": str(r[0]), "tenant_id": r[1], "filename": r[2],
            "file_type": r[3], "file_size_bytes": r[4], "status": r[5],
            "quality_score": r[6], "quality_issues": r[7] or [],
            "metadata": r[8] or {},
            "uploaded_at": r[9].isoformat() if r[9] else None,
            "chunk_count": r[10],
        }
        for r in rows
    ]


def get_document_detail(doc_id: str) -> Optional[dict]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, tenant_id, filename, file_type, file_size_bytes,
                       content_raw, content_processed, status,
                       quality_score, quality_issues, metadata, chunk_config,
                       rejection_reason, uploaded_at, processed_at, ingested_at
                FROM training_documents WHERE id=%s
                """,
                (doc_id,),
            )
            r = cur.fetchone()
    if not r:
        return None
    return {
        "id": str(r[0]), "tenant_id": r[1], "filename": r[2], "file_type": r[3],
        "file_size_bytes": r[4], "content_raw": r[5], "content_processed": r[6],
        "status": r[7], "quality_score": r[8], "quality_issues": r[9] or [],
        "metadata": r[10] or {}, "chunk_config": r[11] or {},
        "rejection_reason": r[12],
        "uploaded_at": r[13].isoformat() if r[13] else None,
        "processed_at": r[14].isoformat() if r[14] else None,
        "ingested_at": r[15].isoformat() if r[15] else None,
    }


def update_document(doc_id: str, content_processed: Optional[str] = None,
                    metadata: Optional[dict] = None, chunk_config: Optional[dict] = None,
                    status: Optional[str] = None, processed_by: Optional[str] = None) -> bool:
    fields, values = [], []
    if content_processed is not None:
        fields.append("content_processed=%s"); values.append(content_processed)
    if metadata is not None:
        import json
        fields.append("metadata=%s"); values.append(json.dumps(metadata))
    if chunk_config is not None:
        import json
        fields.append("chunk_config=%s"); values.append(json.dumps(chunk_config))
    if status is not None:
        fields.append("status=%s"); values.append(status)
    if processed_by is not None:
        fields.append("processed_by=%s"); values.append(processed_by)
        fields.append("processed_at=%s"); values.append(datetime.utcnow())
    fields.append("updated_at=%s"); values.append(datetime.utcnow())
    values.append(doc_id)

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(f"UPDATE training_documents SET {', '.join(fields)} WHERE id=%s", values)
        conn.commit()
    return True


def reject_document(doc_id: str, reason: str, processed_by: Optional[str] = None) -> bool:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE training_documents SET status='rejected', rejection_reason=%s, processed_by=%s, updated_at=NOW() WHERE id=%s",
                (reason, processed_by, doc_id),
            )
        conn.commit()
    return True


def get_all_documents() -> list[dict]:
    """Todos los documentos sin filtro (cross-tenant) para panel admin."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT d.id, d.tenant_id, d.filename, d.file_type, d.file_size_bytes,
                       d.status, d.quality_score, d.quality_issues, d.metadata,
                       d.uploaded_at, d.ingested_at, d.rejection_reason,
                       (SELECT COUNT(*) FROM training_chunks c WHERE c.document_id=d.id) AS chunk_count
                FROM training_documents d
                ORDER BY d.uploaded_at DESC
                """,
            )
            rows = cur.fetchall()
    return [
        {
            "id": str(r[0]), "tenant_id": r[1], "filename": r[2],
            "file_type": r[3], "file_size_bytes": r[4], "status": r[5],
            "quality_score": r[6], "quality_issues": r[7] or [],
            "metadata": r[8] or {},
            "uploaded_at": r[9].isoformat() if r[9] else None,
            "ingested_at": r[10].isoformat() if r[10] else None,
            "rejection_reason": r[11],
            "chunk_count": r[12],
        }
        for r in rows
    ]


def get_training_metrics() -> dict:
    """Métricas agregadas globales de entrenamiento."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            # Documentos por estado
            cur.execute("SELECT status, COUNT(*) FROM training_documents GROUP BY status")
            by_status = {r[0]: r[1] for r in cur.fetchall()}

            # Quality score stats
            cur.execute("""
                SELECT
                    ROUND(AVG(quality_score)::numeric, 2),
                    COUNT(*) FILTER (WHERE quality_score < 0.4),
                    COUNT(*) FILTER (WHERE quality_score >= 0.9)
                FROM training_documents WHERE quality_score IS NOT NULL
            """)
            q = cur.fetchone()
            avg_quality = float(q[0]) if q[0] else 0.0
            below_threshold = q[1] or 0
            perfect = q[2] or 0

            # Chunks y embeddings totales
            cur.execute("SELECT COUNT(*), COALESCE(AVG(token_count),0) FROM training_chunks")
            r = cur.fetchone()
            total_chunks = r[0] or 0
            avg_tokens = float(r[1]) if r[1] else 0.0

            cur.execute("SELECT COUNT(*), COUNT(DISTINCT embedding_model) FROM training_embeddings")
            r = cur.fetchone()
            total_embeddings = r[0] or 0
            models_count = r[1] or 0

            # Por tenant
            cur.execute("""
                SELECT
                    d.tenant_id,
                    COUNT(*) AS total_docs,
                    COUNT(*) FILTER (WHERE d.status='ingested') AS ingested,
                    COUNT(*) FILTER (WHERE d.status NOT IN ('ingested','rejected')) AS pending,
                    (SELECT COUNT(*) FROM training_chunks c WHERE c.tenant_id=d.tenant_id) AS chunks,
                    MAX(d.uploaded_at) AS last_upload
                FROM training_documents d
                GROUP BY d.tenant_id
                ORDER BY last_upload DESC
            """)
            tenants = [
                {
                    "tenant_id": r[0], "total_docs": r[1], "ingested": r[2],
                    "pending": r[3], "chunks": r[4],
                    "last_upload": r[5].isoformat() if r[5] else None,
                }
                for r in cur.fetchall()
            ]

            # Actividad últimos 7 días
            cur.execute("""
                SELECT DATE(uploaded_at), COUNT(*)
                FROM training_documents
                WHERE uploaded_at >= NOW() - INTERVAL '7 days'
                GROUP BY DATE(uploaded_at)
                ORDER BY DATE(uploaded_at)
            """)
            daily = [{"date": str(r[0]), "count": r[1]} for r in cur.fetchall()]

    return {
        "documents": {
            "by_status": by_status,
            "total": sum(by_status.values()),
            "ingested": by_status.get("ingested", 0),
            "pending": sum(v for k, v in by_status.items() if k not in ("ingested", "rejected")),
            "rejected": by_status.get("rejected", 0),
            "failed": by_status.get("failed", 0),
        },
        "quality": {
            "avg_score": avg_quality,
            "below_threshold": below_threshold,
            "perfect": perfect,
        },
        "chunks": {
            "total": total_chunks,
            "avg_tokens_per_chunk": round(avg_tokens, 1),
        },
        "embeddings": {
            "total": total_embeddings,
            "models_count": models_count,
        },
        "by_tenant": tenants,
        "daily_uploads": daily,
    }


def get_tenant_training_status(tenant_id: str) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT status, COUNT(*) FROM training_documents
                WHERE tenant_id=%s GROUP BY status
                """,
                (tenant_id,),
            )
            by_status = {r[0]: r[1] for r in cur.fetchall()}
            cur.execute(
                "SELECT COUNT(*) FROM training_chunks WHERE tenant_id=%s", (tenant_id,)
            )
            chunks = cur.fetchone()[0]
            cur.execute(
                "SELECT COUNT(*) FROM training_embeddings WHERE tenant_id=%s", (tenant_id,)
            )
            embeddings = cur.fetchone()[0]

    return {
        "tenant_id": tenant_id,
        "documents": by_status,
        "total_chunks": chunks,
        "total_embeddings": embeddings,
    }
