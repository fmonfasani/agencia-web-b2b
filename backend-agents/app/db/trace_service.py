"""
app/db/trace_service.py - Persistencia de traces en PostgreSQL
"""
import os
import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any

import psycopg2
from psycopg2.extras import Json

logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is required. "
        "Set it in your .env file or deployment config."
    )


def get_connection():
    """Conectar a PostgreSQL"""
    try:
        return psycopg2.connect(DATABASE_URL)
    except Exception as e:
        logger.error(f"Error conectando a DB: {e}")
        raise


def ensure_traces_table():
    """Crear tabla de traces si no existe"""
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS agent_request_traces (
                id              SERIAL PRIMARY KEY,
                trace_id        VARCHAR(100) UNIQUE NOT NULL,
                tenant_id       VARCHAR(100) NOT NULL,
                user_id         VARCHAR(100),
                query           TEXT,
                iterations      INT,
                result          JSONB,
                rag_context     JSONB,
                metadata        JSONB,
                embedding_ms    INT,
                rag_ms          INT,
                llm_ms          INT,
                total_ms        INT,
                finish_reason   VARCHAR(50),
                created_at      TIMESTAMP DEFAULT NOW(),
                updated_at      TIMESTAMP DEFAULT NOW()
            );
        """)
        
        # Índices
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_trace_id ON agent_request_traces(trace_id);
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_tenant_created ON agent_request_traces(tenant_id, created_at);
        """)
        
        conn.commit()
        logger.info("Table agent_request_traces OK")
    except Exception as e:
        logger.error(f"Error creating traces table: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()


async def persist_trace(
    trace_id: str,
    tenant_id: str,
    query: str,
    iterations: int,
    result: list,
    metadata: Dict[str, Any],
    rag_context: Optional[list] = None,
    user_id: Optional[str] = None,
):
    """
    Persistir trace de ejecución en PostgreSQL.
    
    Args:
        trace_id: ID único del trace
        tenant_id: ID del tenant
        query: Pregunta original
        iterations: Número de iteraciones
        result: Respuesta final
        metadata: Metadata (timing, finish_reason, etc)
        rag_context: Chunks recuperados por RAG
        user_id: ID del usuario (opcional)
    """
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            INSERT INTO agent_request_traces (
                trace_id, tenant_id, user_id, query, iterations,
                result, rag_context, metadata,
                embedding_ms, rag_ms, llm_ms, total_ms, finish_reason
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            trace_id,
            tenant_id,
            user_id,
            query,
            iterations,
            Json(result),
            Json(rag_context or []),
            Json(metadata),
            metadata.get("embedding_ms"),
            metadata.get("rag_ms"),
            metadata.get("llm_ms"),
            metadata.get("total_duration_ms"),
            metadata.get("finish_reason")
        ))
        
        conn.commit()
        logger.info(f"Trace {trace_id} persistido")
    except Exception as e:
        logger.error(f"Error persistiendo trace: {e}")
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


async def get_trace(trace_id: str) -> Optional[Dict[str, Any]]:
    """Obtener trace por ID"""
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT * FROM agent_request_traces WHERE trace_id = %s
        """, (trace_id,))
        
        row = cur.fetchone()
        if not row:
            return None
        
        # Convertir a dict
        cols = [desc[0] for desc in cur.description]
        return dict(zip(cols, row))
    finally:
        cur.close()
        conn.close()


async def list_tenant_traces(
    tenant_id: str,
    limit: int = 100,
    offset: int = 0
) -> list:
    """Listar traces de un tenant"""
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT * FROM agent_request_traces
            WHERE tenant_id = %s
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """, (tenant_id, limit, offset))
        
        rows = cur.fetchall()
        cols = [desc[0] for desc in cur.description]
        return [dict(zip(cols, row)) for row in rows]
    finally:
        cur.close()
        conn.close()
