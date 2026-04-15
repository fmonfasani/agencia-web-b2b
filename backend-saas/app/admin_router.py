"""
admin_router.py — Control Plane endpoints for admin/super_admin only.

Control Plane (this router):
  - tenant registry + health
  - per-tenant overview (users + usage aggregated from traces)
  - per-tenant logs (paginated traces)
  - impersonation token (session context)

Data Plane (backend-agents):
  - live agent execution
  - raw traces

Rule: admin NEVER reads tenant DB directly — always through service layer.
"""
import logging
import json
import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
import psycopg2

from app.auth_router import require_admin

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["Control Plane — Admin"])

_DSN = os.environ.get("DATABASE_URL", "")


def _conn():
    return psycopg2.connect(_DSN)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _health_status(error_count: int, total: int) -> str:
    if total == 0:
        return "inactive"
    rate = error_count / total
    if rate >= 0.3:
        return "error"
    if rate >= 0.1:
        return "warning"
    return "healthy"


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get(
    "/tenants",
    summary="List all tenants [ADMIN]",
    description="""
Control Plane view — lists every tenant with:
- user count
- 7-day query volume + error count
- last activity timestamp
- health status (healthy / warning / error / inactive)
    """,
    response_model=list[dict],
)
async def list_tenants(admin: dict = Depends(require_admin)):
    try:
        conn = _conn()
        cur = conn.cursor()

        # All tenants
        cur.execute("""
            SELECT id, nombre, industria, config, created_at, updated_at
            FROM tenants
            ORDER BY created_at DESC
        """)
        tenant_rows = cur.fetchall()

        cutoff = datetime.now(timezone.utc) - timedelta(days=7)
        result = []

        for tid, nombre, industria, config, created_at, updated_at in tenant_rows:
            # User count for this tenant
            cur.execute("""
                SELECT COUNT(*) FROM "User"
                WHERE "defaultTenantId" = %s AND status = 'ACTIVE'
            """, (tid,))
            user_count = cur.fetchone()[0]

            # 7-day trace stats
            cur.execute("""
                SELECT
                    COUNT(*)                          AS total,
                    SUM(CASE WHEN had_error THEN 1 ELSE 0 END) AS errors,
                    MAX(created_at)                   AS last_activity,
                    AVG(total_ms)                     AS avg_ms
                FROM agent_request_traces
                WHERE tenant_id = %s AND created_at >= %s
            """, (tid, cutoff))
            stats = cur.fetchone()
            total_7d = stats[0] or 0
            errors_7d = stats[1] or 0
            last_activity = stats[2]
            avg_ms = round(stats[3] or 0)

            # Config extras
            cfg = {}
            if config:
                try:
                    cfg = config if isinstance(config, dict) else json.loads(config)
                except Exception:
                    pass

            result.append({
                "id": tid,
                "nombre": nombre,
                "industria": industria or "General",
                "website": cfg.get("website"),
                "user_count": user_count,
                "usage_7d": {
                    "total_queries": total_7d,
                    "errors": errors_7d,
                    "avg_latency_ms": avg_ms,
                    "success_rate": round((total_7d - errors_7d) / total_7d, 3) if total_7d else None,
                },
                "last_activity": last_activity.isoformat() if last_activity else None,
                "health": _health_status(errors_7d, total_7d),
                "created_at": created_at.isoformat() if created_at else None,
            })

        conn.close()
        return result

    except Exception as e:
        logger.error(f"[admin] list_tenants error: {e}")
        raise HTTPException(status_code=500, detail="Error listando tenants")


@router.get(
    "/tenants/{tenant_id}/overview",
    summary="Tenant overview [ADMIN]",
    description="""
Aggregated overview for a single tenant:
- tenant metadata
- active users list
- 7-day + 30-day usage stats
- recent 10 traces (without full payloads)
    """,
    response_model=dict,
)
async def tenant_overview(
    tenant_id: str,
    admin: dict = Depends(require_admin),
):
    try:
        conn = _conn()
        cur = conn.cursor()

        # Tenant
        cur.execute("""
            SELECT id, nombre, industria, config, created_at, updated_at
            FROM tenants WHERE id = %s
        """, (tenant_id,))
        row = cur.fetchone()
        if not row:
            conn.close()
            raise HTTPException(status_code=404, detail="Tenant not found")

        tid, nombre, industria, config_raw, created_at, updated_at = row
        cfg = {}
        if config_raw:
            try:
                cfg = config_raw if isinstance(config_raw, dict) else json.loads(config_raw)
            except Exception:
                pass

        # Users
        cur.execute("""
            SELECT id, email, name, role, status, "createdAt"
            FROM "User"
            WHERE "defaultTenantId" = %s
            ORDER BY "createdAt" DESC
        """, (tenant_id,))
        users = [
            {"id": r[0], "email": r[1], "name": r[2], "role": r[3],
             "status": r[4], "created_at": r[5].isoformat() if r[5] else None}
            for r in cur.fetchall()
        ]

        now = datetime.now(timezone.utc)
        cutoff_7d = now - timedelta(days=7)
        cutoff_30d = now - timedelta(days=30)
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # Usage 7d
        cur.execute("""
            SELECT COUNT(*), SUM(CASE WHEN had_error THEN 1 ELSE 0 END),
                   AVG(total_ms), MIN(total_ms), MAX(total_ms)
            FROM agent_request_traces
            WHERE tenant_id = %s AND created_at >= %s
        """, (tenant_id, cutoff_7d))
        r7 = cur.fetchone()

        # Usage 30d
        cur.execute("""
            SELECT COUNT(*), SUM(CASE WHEN had_error THEN 1 ELSE 0 END), AVG(total_ms)
            FROM agent_request_traces
            WHERE tenant_id = %s AND created_at >= %s
        """, (tenant_id, cutoff_30d))
        r30 = cur.fetchone()

        # Today
        cur.execute("""
            SELECT COUNT(*) FROM agent_request_traces
            WHERE tenant_id = %s AND created_at >= %s
        """, (tenant_id, today))
        today_count = cur.fetchone()[0]

        # Recent traces (last 15, minimal fields)
        cur.execute("""
            SELECT trace_id, query, finish_reason, total_ms, had_error,
                   tokens_in, tokens_out, created_at
            FROM agent_request_traces
            WHERE tenant_id = %s
            ORDER BY created_at DESC
            LIMIT 15
        """, (tenant_id,))
        recent_traces = [
            {
                "trace_id": r[0],
                "query": (r[1] or "")[:120],
                "finish_reason": r[2],
                "total_ms": r[3],
                "had_error": r[4],
                "tokens_in": r[5],
                "tokens_out": r[6],
                "created_at": r[7].isoformat() if r[7] else None,
            }
            for r in cur.fetchall()
        ]

        conn.close()

        total_7d = r7[0] or 0
        errors_7d = r7[1] or 0
        total_30d = r30[0] or 0
        errors_30d = r30[1] or 0

        return {
            "tenant": {
                "id": tid,
                "nombre": nombre,
                "industria": industria or "General",
                "website": cfg.get("website"),
                "created_at": created_at.isoformat() if created_at else None,
                "updated_at": updated_at.isoformat() if updated_at else None,
            },
            "users": users,
            "usage": {
                "queries_today": today_count,
                "queries_7d": total_7d,
                "errors_7d": errors_7d,
                "success_rate_7d": round((total_7d - errors_7d) / total_7d, 3) if total_7d else None,
                "avg_latency_ms_7d": round(r7[2] or 0),
                "min_latency_ms_7d": r7[3] or 0,
                "max_latency_ms_7d": r7[4] or 0,
                "queries_30d": total_30d,
                "errors_30d": errors_30d,
                "avg_latency_ms_30d": round(r30[2] or 0),
            },
            "health": _health_status(errors_7d, total_7d),
            "recent_traces": recent_traces,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[admin] tenant_overview {tenant_id} error: {e}")
        raise HTTPException(status_code=500, detail="Error cargando overview del tenant")


@router.get(
    "/tenants/{tenant_id}/logs",
    summary="Tenant logs / traces [ADMIN]",
    description="""
Paginated trace log for a specific tenant.
Filters: `had_error`, `finish_reason`, `query` (substring match).
    """,
    response_model=dict,
)
async def tenant_logs(
    tenant_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    had_error: Optional[bool] = Query(None),
    finish_reason: Optional[str] = Query(None),
    q: Optional[str] = Query(None, description="Substring match on query text"),
    admin: dict = Depends(require_admin),
):
    try:
        conn = _conn()
        cur = conn.cursor()

        # Verify tenant exists
        cur.execute("SELECT id FROM tenants WHERE id = %s", (tenant_id,))
        if not cur.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="Tenant not found")

        # Build dynamic WHERE
        conditions = ["tenant_id = %s"]
        params: list = [tenant_id]

        if had_error is not None:
            conditions.append("had_error = %s")
            params.append(had_error)
        if finish_reason:
            conditions.append("finish_reason = %s")
            params.append(finish_reason)
        if q:
            conditions.append("query ILIKE %s")
            params.append(f"%{q}%")

        where = " AND ".join(conditions)

        # Total count
        cur.execute(f"SELECT COUNT(*) FROM agent_request_traces WHERE {where}", params)
        total = cur.fetchone()[0]

        # Paginated rows
        cur.execute(f"""
            SELECT trace_id, query, finish_reason, total_ms, had_error,
                   iterations, tokens_in, tokens_out, metadata, created_at
            FROM agent_request_traces
            WHERE {where}
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """, params + [limit, offset])

        rows = []
        for r in cur.fetchall():
            meta = {}
            if r[8]:
                try:
                    meta = r[8] if isinstance(r[8], dict) else json.loads(r[8])
                except Exception:
                    pass
            rows.append({
                "trace_id": r[0],
                "query": (r[1] or "")[:200],
                "finish_reason": r[2],
                "total_ms": r[3],
                "had_error": r[4],
                "iterations": r[5],
                "tokens_in": r[6],
                "tokens_out": r[7],
                "model": meta.get("model"),
                "tools": meta.get("tools_executed", []),
                "created_at": r[9].isoformat() if r[9] else None,
            })

        conn.close()
        return {
            "tenant_id": tenant_id,
            "total": total,
            "limit": limit,
            "offset": offset,
            "rows": rows,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[admin] tenant_logs {tenant_id} error: {e}")
        raise HTTPException(status_code=500, detail="Error cargando logs del tenant")


@router.get(
    "/stats",
    summary="Global platform stats [ADMIN]",
    response_model=dict,
)
async def global_stats(admin: dict = Depends(require_admin)):
    """Quick platform-wide numbers for the admin dashboard header."""
    try:
        conn = _conn()
        cur = conn.cursor()

        now = datetime.now(timezone.utc)
        cutoff_7d = now - timedelta(days=7)
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)

        cur.execute("SELECT COUNT(*) FROM tenants")
        total_tenants = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM \"User\" WHERE status = 'ACTIVE'")
        total_users = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM agent_request_traces WHERE created_at >= %s", (cutoff_7d,))
        queries_7d = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM agent_request_traces WHERE created_at >= %s", (today,))
        queries_today = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(*) FROM agent_request_traces
            WHERE had_error = true AND created_at >= %s
        """, (cutoff_7d,))
        errors_7d = cur.fetchone()[0]

        conn.close()
        return {
            "total_tenants": total_tenants,
            "total_active_users": total_users,
            "queries_7d": queries_7d,
            "queries_today": queries_today,
            "errors_7d": errors_7d,
            "platform_health": _health_status(errors_7d, queries_7d),
        }

    except Exception as e:
        logger.error(f"[admin] global_stats error: {e}")
        raise HTTPException(status_code=500, detail="Error cargando estadísticas globales")
