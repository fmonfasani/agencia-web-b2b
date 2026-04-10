"""
db/pool.py — Centralized PostgreSQL connection pool for backend-saas.

Uses ThreadedConnectionPool (psycopg2) which is safe for sync code
called from FastAPI's thread-pool executor (sync endpoints / background tasks).

Usage:
    from app.db.pool import get_conn, release_conn

    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
        conn.commit()
    finally:
        release_conn(conn)

Or with the context manager helper:
    from app.db.pool import db_conn

    with db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
"""
import os
import logging
import contextlib
from typing import Generator

import psycopg2
import psycopg2.pool

logger = logging.getLogger(__name__)

_DATABASE_URL = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_PRISMA_URL")
if not _DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is required. "
        "Set it in your .env file or deployment config."
    )

_MIN_CONN = int(os.getenv("DB_POOL_MIN", "2"))
_MAX_CONN = int(os.getenv("DB_POOL_MAX", "20"))

_pool: psycopg2.pool.ThreadedConnectionPool | None = None


def _get_pool() -> psycopg2.pool.ThreadedConnectionPool:
    global _pool
    if _pool is None or _pool.closed:
        logger.info(
            f"Initializing DB pool (min={_MIN_CONN}, max={_MAX_CONN})"
        )
        _pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=_MIN_CONN,
            maxconn=_MAX_CONN,
            dsn=_DATABASE_URL,
        )
    return _pool


def get_conn() -> psycopg2.extensions.connection:
    """Borrow a connection from the pool."""
    return _get_pool().getconn()


def release_conn(conn: psycopg2.extensions.connection) -> None:
    """Return a connection to the pool."""
    _get_pool().putconn(conn)


@contextlib.contextmanager
def db_conn() -> Generator[psycopg2.extensions.connection, None, None]:
    """Context manager — automatically returns connection to pool."""
    conn = get_conn()
    try:
        yield conn
    except Exception:
        conn.rollback()
        raise
    finally:
        release_conn(conn)
