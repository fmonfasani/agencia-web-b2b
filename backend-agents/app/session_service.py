"""
session_service.py — Conversation session persistence for the agent engine.

Stores per-session conversation history (tenant-scoped).
Each session is a list of {role, content, timestamp} messages.

Usage:
    session_id = create_session(tenant_id, user_id)
    history    = get_session_messages(session_id, tenant_id)
    append_messages(session_id, new_messages)
"""
import os
import json
import logging
import secrets
from datetime import datetime
from typing import Any, Dict, List, Optional

import psycopg2

logger = logging.getLogger(__name__)

_DATABASE_URL = os.environ.get("DATABASE_URL")
if not _DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is required. "
        "Set it in your .env file or deployment config."
    )

# Maximum messages kept per session to prevent unbounded growth
_MAX_HISTORY = 20


def ensure_sessions_table() -> None:
    """Create agent_sessions table if it doesn't exist. Called at startup."""
    try:
        conn = psycopg2.connect(_DATABASE_URL)
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS agent_sessions (
                session_id  TEXT        PRIMARY KEY,
                tenant_id   TEXT        NOT NULL,
                user_id     TEXT,
                messages    JSONB       NOT NULL DEFAULT '[]',
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_sessions_tenant_updated
            ON agent_sessions (tenant_id, updated_at DESC)
        """)
        conn.commit()
        cur.close()
        conn.close()
        logger.info("[session_service] Table agent_sessions ready")
    except Exception as e:
        logger.error(f"[session_service] Error ensuring table: {e}")


def create_session(tenant_id: str, user_id: Optional[str] = None) -> str:
    """Create a new empty session and return its session_id."""
    session_id = f"s_{secrets.token_hex(16)}"
    try:
        conn = psycopg2.connect(_DATABASE_URL)
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO agent_sessions (session_id, tenant_id, user_id, messages)
            VALUES (%s, %s, %s, '[]'::jsonb)
            """,
            (session_id, tenant_id, user_id),
        )
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        logger.error(f"[session_service] Error creating session: {e}")
    return session_id


def get_session_messages(session_id: str, tenant_id: str) -> List[Dict[str, Any]]:
    """
    Return conversation history for a session.
    Returns [] if not found or if tenant_id does not match (security guard).
    Returns at most _MAX_HISTORY messages (most recent).
    """
    try:
        conn = psycopg2.connect(_DATABASE_URL)
        cur = conn.cursor()
        cur.execute(
            "SELECT messages FROM agent_sessions WHERE session_id = %s AND tenant_id = %s",
            (session_id, tenant_id),
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            return []
        messages = row[0]
        if isinstance(messages, str):
            messages = json.loads(messages)
        return (messages or [])[-_MAX_HISTORY:]
    except Exception as e:
        logger.error(f"[session_service] Error loading session {session_id}: {e}")
        return []


def append_messages(session_id: str, new_messages: List[Dict[str, Any]]) -> None:
    """
    Append new_messages to the session's history.
    Each message gets a 'timestamp' field stamped at append time.
    Trims the stored array to _MAX_HISTORY * 2 to prevent unbounded growth.
    """
    if not new_messages:
        return
    try:
        stamped = [
            {**m, "timestamp": datetime.utcnow().isoformat()}
            for m in new_messages
        ]
        conn = psycopg2.connect(_DATABASE_URL)
        cur = conn.cursor()
        # Append and trim to last _MAX_HISTORY * 2 messages atomically
        cur.execute(
            """
            UPDATE agent_sessions
            SET messages   = (
                    SELECT jsonb_agg(elem)
                    FROM (
                        SELECT elem
                        FROM jsonb_array_elements(messages || %s::jsonb) AS elem
                        ORDER BY (elem->>'timestamp') DESC NULLS LAST
                        LIMIT %s
                    ) sub
                ),
                updated_at = NOW()
            WHERE session_id = %s
            """,
            (json.dumps(stamped), _MAX_HISTORY * 2, session_id),
        )
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        logger.error(f"[session_service] Error appending to session {session_id}: {e}")
