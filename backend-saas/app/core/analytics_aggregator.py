"""
core/analytics_aggregator.py — Real Analytics Aggregation Pipeline

BEFORE (broken):
  - analytics_daily table existed but was NEVER populated
  - Dashboard was reading from usage_events directly (slow, unindexed)
  - No aggregation job existed

AFTER:
  - aggregate_daily() reads usage_events, writes to analytics_daily
  - Upsert pattern: safe to re-run (idempotent)
  - Runs as an asyncio background task (scheduled every hour)
  - Also exposed as endpoints: GET /analytics/global, GET /analytics/tenant

Analytics pipeline:
    usage_events (raw, append-only)
        ↓  aggregate_daily() — runs hourly
    analytics_daily (pre-aggregated, indexed)
        ↓  served by /analytics/* endpoints
    Dashboard

Aggregation covers:
  - executions, tokens_in, tokens_out, cost_usd
  - grouped by: date × tenant_id × agent_type
  - error_count (finish_reason != 'stop')
  - avg_duration_ms
"""
import asyncio
import logging
import os
from datetime import date, timedelta
from typing import Optional

import psycopg2

logger = logging.getLogger(__name__)

_AGGREGATION_INTERVAL_SECONDS = 3600  # run every hour


def _get_db_dsn() -> str:
    return os.environ.get("DATABASE_URL", "")


# ── Core aggregation ──────────────────────────────────────────────────────────

def aggregate_daily(target_date: Optional[date] = None) -> int:
    """
    Aggregate usage_events → analytics_daily for the given date.
    Defaults to today (safe to re-run multiple times — upsert).

    Returns the number of rows upserted.
    """
    if target_date is None:
        target_date = date.today()

    date_str = target_date.isoformat()

    try:
        conn = psycopg2.connect(_get_db_dsn())
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO analytics_daily (
                date,
                tenant_id,
                agent_type,
                executions,
                tokens_in,
                tokens_out,
                cost_usd,
                error_count,
                avg_duration_ms
            )
            SELECT
                DATE(created_at)                       AS date,
                tenant_id,
                agent_type,
                COUNT(*)                               AS executions,
                COALESCE(SUM(tokens_in),  0)           AS tokens_in,
                COALESCE(SUM(tokens_out), 0)           AS tokens_out,
                COALESCE(SUM(cost_usd),  0.0)          AS cost_usd,
                COUNT(*) FILTER (WHERE finish_reason != 'stop') AS error_count,
                COALESCE(AVG(duration_ms), 0)::INTEGER AS avg_duration_ms
            FROM usage_events
            WHERE DATE(created_at) = %s
            GROUP BY DATE(created_at), tenant_id, agent_type
            ON CONFLICT (date, tenant_id, agent_type)
            DO UPDATE SET
                executions      = EXCLUDED.executions,
                tokens_in       = EXCLUDED.tokens_in,
                tokens_out      = EXCLUDED.tokens_out,
                cost_usd        = EXCLUDED.cost_usd,
                error_count     = EXCLUDED.error_count,
                avg_duration_ms = EXCLUDED.avg_duration_ms,
                updated_at      = NOW()
        """, (date_str,))

        rows_affected = cur.rowcount
        conn.commit()
        conn.close()
        logger.info(f"[Analytics] Aggregated {rows_affected} rows for {date_str}")
        return rows_affected

    except Exception as e:
        logger.error(f"[Analytics] aggregate_daily failed for {date_str}: {e}")
        return 0


def aggregate_date_range(start: date, end: date) -> int:
    """Backfill aggregation for a range of dates. Inclusive on both ends."""
    total = 0
    current = start
    while current <= end:
        total += aggregate_daily(current)
        current += timedelta(days=1)
    return total


# ── Background scheduler ──────────────────────────────────────────────────────

async def run_aggregation_loop() -> None:
    """
    Async loop — runs aggregate_daily() every hour.
    Register as an asyncio task on startup (see main.py).

    Also runs for yesterday if it's early in the day (to catch late events).
    """
    logger.info("[Analytics] Aggregation scheduler started")
    while True:
        try:
            today = date.today()
            aggregate_daily(today)
            # Re-aggregate yesterday to catch any late-arriving events
            aggregate_daily(today - timedelta(days=1))
        except Exception as e:
            logger.error(f"[Analytics] Scheduler error: {e}")

        await asyncio.sleep(_AGGREGATION_INTERVAL_SECONDS)


# ── Query helpers (used by API endpoints) ────────────────────────────────────

def get_global_analytics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit_tenants: int = 50,
) -> dict:
    """
    Platform-wide analytics aggregated from analytics_daily.
    Used by GET /analytics/global (SUPER_ADMIN / ANALISTA only).
    """
    try:
        conn = psycopg2.connect(_get_db_dsn())
        cur = conn.cursor()

        date_filter = ""
        params: list = []
        if start_date:
            date_filter += " AND date >= %s"
            params.append(start_date)
        if end_date:
            date_filter += " AND date <= %s"
            params.append(end_date)

        # Daily totals
        cur.execute(f"""
            SELECT
                date,
                SUM(executions)   AS executions,
                SUM(tokens_in)    AS tokens_in,
                SUM(tokens_out)   AS tokens_out,
                SUM(cost_usd)     AS cost_usd,
                SUM(error_count)  AS errors
            FROM analytics_daily
            WHERE 1=1 {date_filter}
            GROUP BY date
            ORDER BY date DESC
            LIMIT 90
        """, params)
        daily = [
            {
                "date": str(r[0]),
                "executions": r[1],
                "tokens_in": r[2],
                "tokens_out": r[3],
                "cost_usd": float(r[4]),
                "errors": r[5],
            }
            for r in cur.fetchall()
        ]

        # Top tenants by cost
        cur.execute(f"""
            SELECT
                tenant_id,
                SUM(executions)  AS executions,
                SUM(tokens_in + tokens_out) AS tokens_total,
                SUM(cost_usd)    AS cost_usd
            FROM analytics_daily
            WHERE 1=1 {date_filter}
            GROUP BY tenant_id
            ORDER BY cost_usd DESC
            LIMIT %s
        """, params + [limit_tenants])
        top_tenants = [
            {
                "tenant_id": r[0],
                "executions": r[1],
                "tokens_total": r[2],
                "cost_usd": float(r[3]),
            }
            for r in cur.fetchall()
        ]

        # Totals
        cur.execute(f"""
            SELECT
                SUM(executions), SUM(tokens_in), SUM(tokens_out),
                SUM(cost_usd), SUM(error_count)
            FROM analytics_daily
            WHERE 1=1 {date_filter}
        """, params)
        totals_row = cur.fetchone() or (0, 0, 0, 0.0, 0)

        conn.close()
        return {
            "daily": daily,
            "top_tenants": top_tenants,
            "totals": {
                "executions":   totals_row[0] or 0,
                "tokens_in":    totals_row[1] or 0,
                "tokens_out":   totals_row[2] or 0,
                "cost_usd":     float(totals_row[3] or 0),
                "errors":       totals_row[4] or 0,
            },
        }
    except Exception as e:
        logger.error(f"[Analytics] get_global_analytics failed: {e}")
        return {"daily": [], "top_tenants": [], "totals": {}, "error": str(e)}


def get_tenant_analytics(tenant_id: str, months: int = 3) -> dict:
    """
    Per-tenant analytics. Used by GET /analytics/tenant.
    """
    try:
        conn = psycopg2.connect(_get_db_dsn())
        cur = conn.cursor()

        cur.execute("""
            SELECT
                date,
                agent_type,
                executions,
                tokens_in,
                tokens_out,
                cost_usd,
                error_count,
                avg_duration_ms
            FROM analytics_daily
            WHERE tenant_id = %s
              AND date >= CURRENT_DATE - INTERVAL '%s months'
            ORDER BY date DESC
        """, (tenant_id, months))

        rows = cur.fetchall()
        conn.close()

        # Group by date for the timeseries view
        by_date: dict[str, dict] = {}
        for r in rows:
            d = str(r[0])
            if d not in by_date:
                by_date[d] = {
                    "date": d, "executions": 0, "tokens_in": 0,
                    "tokens_out": 0, "cost_usd": 0.0, "errors": 0,
                }
            by_date[d]["executions"] += r[2]
            by_date[d]["tokens_in"]  += r[3]
            by_date[d]["tokens_out"] += r[4]
            by_date[d]["cost_usd"]   += float(r[5])
            by_date[d]["errors"]     += r[6]

        daily = sorted(by_date.values(), key=lambda x: x["date"], reverse=True)

        return {
            "tenant_id": tenant_id,
            "daily": daily,
            "totals": {
                "executions": sum(d["executions"] for d in daily),
                "tokens_in":  sum(d["tokens_in"]  for d in daily),
                "tokens_out": sum(d["tokens_out"] for d in daily),
                "cost_usd":   round(sum(d["cost_usd"] for d in daily), 6),
                "errors":     sum(d["errors"]     for d in daily),
            },
        }
    except Exception as e:
        logger.error(f"[Analytics] get_tenant_analytics failed for {tenant_id}: {e}")
        return {"tenant_id": tenant_id, "daily": [], "totals": {}, "error": str(e)}
