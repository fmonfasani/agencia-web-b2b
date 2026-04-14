"""
core/background_jobs.py — Scheduled background jobs

Jobs registered here are started from main.py on_event("startup").

Job 1 — reconcile_quota_state():
  Compares Redis counters against PostgreSQL usage_events.
  Corrects Redis if drift > threshold.
  Runs every 5 minutes.

Job 2 — cleanup_stale_reservations():
  Sets status='rolled_back' on quota_reservations where status='pending'
  and expires_at < NOW() (execution never committed or rolled back).
  Runs every 60 seconds.

Both jobs are designed to be:
  - Idempotent (safe to run multiple times)
  - Non-blocking (use asyncio.sleep between iterations)
  - Silent on success, loud on anomaly
"""
import asyncio
import logging
import os
from datetime import date
from typing import Optional

import psycopg2
import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

_RECONCILE_INTERVAL_S = int(os.getenv("RECONCILE_INTERVAL_S", "300"))   # 5 min
_CLEANUP_INTERVAL_S   = int(os.getenv("CLEANUP_INTERVAL_S",   "60"))    # 1 min
_DRIFT_THRESHOLD      = int(os.getenv("QUOTA_DRIFT_THRESHOLD", "50"))   # tokens


def _get_db_dsn() -> str:
    return os.environ.get("DATABASE_URL", "")


def _get_redis() -> aioredis.Redis:
    url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    return aioredis.from_url(url, decode_responses=True)


# ── Job 1: Quota reconciliation ───────────────────────────────────────────────

def _redis_tokens_key(tenant_id: str) -> str:
    m = date.today().strftime("%Y-%m")
    return f"quota:tokens:{tenant_id}:{m}"


def _compute_db_tokens(conn, tenant_id: str, month: str) -> int:
    """Sum tokens_in + tokens_out from usage_events for the current month."""
    cur = conn.cursor()
    cur.execute("""
        SELECT COALESCE(SUM(tokens_in + tokens_out), 0)
        FROM usage_events
        WHERE tenant_id = %s
          AND TO_CHAR(created_at, 'YYYY-MM') = %s
    """, (tenant_id, month))
    row = cur.fetchone()
    return int(row[0]) if row else 0


def _list_active_tenants(conn) -> list[str]:
    cur = conn.cursor()
    cur.execute('SELECT DISTINCT tenant_id FROM tenant_quotas')
    return [r[0] for r in cur.fetchall()]


async def reconcile_quota_state(tenant_id: Optional[str] = None) -> dict:
    """
    Compare Redis token counters against PostgreSQL usage_events.

    For each tenant (or just tenant_id if specified):
      1. Read Redis counter
      2. Sum tokens from usage_events (source of truth)
      3. If drift > threshold → overwrite Redis with DB value
      4. Log the anomaly

    Returns a summary dict with corrected tenants and drift amounts.
    """
    month = date.today().strftime("%Y-%m")
    summary = {"checked": 0, "corrected": 0, "errors": 0, "corrections": []}

    try:
        conn = psycopg2.connect(_get_db_dsn())
        r = _get_redis()

        tenants = [tenant_id] if tenant_id else _list_active_tenants(conn)
        summary["checked"] = len(tenants)

        for tid in tenants:
            try:
                key = _redis_tokens_key(tid)
                redis_val = await r.get(key)
                redis_tokens = int(redis_val) if redis_val is not None else None

                if redis_tokens is None:
                    # Counter not in Redis yet — nothing to reconcile
                    continue

                db_tokens = _compute_db_tokens(conn, tid, month)
                drift = abs(redis_tokens - db_tokens)

                if drift > _DRIFT_THRESHOLD:
                    logger.warning(
                        f"[Reconcile] Quota drift detected — tenant={tid} "
                        f"redis={redis_tokens} db={db_tokens} drift={drift}"
                    )
                    # Authoritative source is PostgreSQL usage_events
                    await r.set(key, db_tokens)
                    summary["corrected"] += 1
                    summary["corrections"].append({
                        "tenant_id": tid,
                        "redis_was": redis_tokens,
                        "db_value": db_tokens,
                        "drift": drift,
                    })

            except Exception as e:
                logger.error(f"[Reconcile] Error processing tenant={tid}: {e}")
                summary["errors"] += 1

        conn.close()

    except Exception as e:
        logger.error(f"[Reconcile] Fatal error: {e}")
        summary["errors"] += 1

    if summary["corrected"] > 0:
        logger.info(
            f"[Reconcile] Done — checked={summary['checked']} "
            f"corrected={summary['corrected']} errors={summary['errors']}"
        )

    return summary


async def run_reconciliation_loop() -> None:
    """Run reconcile_quota_state() every RECONCILE_INTERVAL_S seconds."""
    logger.info(f"[Jobs] Quota reconciliation loop started (interval={_RECONCILE_INTERVAL_S}s)")
    while True:
        await asyncio.sleep(_RECONCILE_INTERVAL_S)
        try:
            await reconcile_quota_state()
        except Exception as e:
            logger.error(f"[Jobs] reconciliation loop error: {e}")


# ── Job 2: Stale reservation cleanup ─────────────────────────────────────────

def _cleanup_stale_reservations_sync() -> int:
    """
    Mark expired pending reservations as rolled_back in PostgreSQL.

    A reservation is stale if:
      status = 'pending' AND expires_at < NOW()

    These represent executions that crashed before __aexit__ ran
    (e.g., worker process killed, OOM, etc.).

    Returns the number of rows updated.
    """
    try:
        conn = psycopg2.connect(_get_db_dsn())
        cur = conn.cursor()
        cur.execute("""
            UPDATE quota_reservations
            SET status = 'rolled_back'
            WHERE status = 'pending'
              AND expires_at < NOW()
        """)
        count = cur.rowcount
        conn.commit()
        conn.close()
        if count > 0:
            logger.warning(
                f"[Cleanup] Rolled back {count} stale pending reservations"
            )
        return count
    except Exception as e:
        logger.error(f"[Cleanup] stale reservation cleanup failed: {e}")
        return 0


async def cleanup_stale_reservations() -> int:
    """Async wrapper for _cleanup_stale_reservations_sync()."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _cleanup_stale_reservations_sync)


async def run_cleanup_loop() -> None:
    """Run cleanup_stale_reservations() every CLEANUP_INTERVAL_S seconds."""
    logger.info(f"[Jobs] Stale reservation cleanup loop started (interval={_CLEANUP_INTERVAL_S}s)")
    # Stagger startup to spread load
    await asyncio.sleep(30)
    while True:
        try:
            await cleanup_stale_reservations()
        except Exception as e:
            logger.error(f"[Jobs] cleanup loop error: {e}")
        await asyncio.sleep(_CLEANUP_INTERVAL_S)
