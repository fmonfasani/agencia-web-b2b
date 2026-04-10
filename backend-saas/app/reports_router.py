"""
Reports Router — Backend SaaS
Endpoints para generación y descarga de reportes por tenant.
"""
import csv
import io
import logging
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse

from .training_service import get_conn

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports", tags=["reports"])


def _get_tenant_id(api_key: str) -> str:
    """Resuelve tenant_id a partir de API key."""
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'SELECT "defaultTenantId", id FROM "User" WHERE "apiKey"=%s AND status=\'ACTIVE\' LIMIT 1',
                    (api_key,),
                )
                row = cur.fetchone()
                if row:
                    return str(row[0]) if row[0] else str(row[1])
    except Exception as e:
        logger.error("Could not resolve tenant: %s", e)
    raise HTTPException(401, "No se pudo resolver el tenant para esta API key")


def _get_api_key(request: Request) -> str:
    api_key = request.headers.get("X-API-Key") or request.headers.get("x-api-key")
    if not api_key:
        raise HTTPException(401, "API key requerida")
    return api_key


# ── Usage report ──────────────────────────────────────────────────────────────

@router.get("/usage")
async def usage_report(
    request: Request,
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    tenant_id: Optional[str] = Query(None),
):
    """
    Métricas de uso: queries por día, latencia promedio, tasa de error.
    Devuelve JSON con daily_stats + summary.
    """
    api_key = _get_api_key(request)
    if not tenant_id:
        tenant_id = _get_tenant_id(api_key)

    # Defaults: últimos 30 días
    end_dt = datetime.fromisoformat(end_date) if end_date else datetime.utcnow()
    start_dt = datetime.fromisoformat(start_date) if start_date else end_dt - timedelta(days=30)

    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                # Daily breakdown
                cur.execute(
                    """
                    SELECT
                        DATE(created_at) AS day,
                        COUNT(*) AS total,
                        COUNT(*) FILTER (WHERE success = false) AS errors,
                        ROUND(AVG(total_duration_ms)::numeric, 0) AS avg_ms,
                        ROUND(AVG(iterations)::numeric, 2) AS avg_iter
                    FROM agent_request_traces
                    WHERE tenant_id = %s
                      AND created_at BETWEEN %s AND %s
                    GROUP BY DATE(created_at)
                    ORDER BY day
                    """,
                    (tenant_id, start_dt, end_dt),
                )
                rows = cur.fetchall()
                daily = [
                    {
                        "date": str(r[0]),
                        "queries": r[1],
                        "errors": r[2],
                        "avg_ms": float(r[3]) if r[3] else 0,
                        "avg_iterations": float(r[4]) if r[4] else 0,
                    }
                    for r in rows
                ]

                # Summary
                cur.execute(
                    """
                    SELECT
                        COUNT(*) AS total,
                        COUNT(*) FILTER (WHERE success = false) AS errors,
                        ROUND(AVG(total_duration_ms)::numeric, 0) AS avg_ms,
                        MIN(total_duration_ms) AS min_ms,
                        MAX(total_duration_ms) AS max_ms
                    FROM agent_request_traces
                    WHERE tenant_id = %s AND created_at BETWEEN %s AND %s
                    """,
                    (tenant_id, start_dt, end_dt),
                )
                s = cur.fetchone()
                total = s[0] or 0
                errors = s[1] or 0

        return {
            "tenant_id": tenant_id,
            "start_date": str(start_dt.date()),
            "end_date": str(end_dt.date()),
            "summary": {
                "total_queries": total,
                "total_errors": errors,
                "success_rate": round((total - errors) / max(total, 1) * 100, 1),
                "avg_latency_ms": float(s[2]) if s[2] else 0,
                "min_latency_ms": float(s[3]) if s[3] else 0,
                "max_latency_ms": float(s[4]) if s[4] else 0,
            },
            "daily_stats": daily,
        }
    except Exception as e:
        logger.error("usage_report error: %s", e)
        raise HTTPException(500, f"Error generando reporte: {e}")


# ── Performance report ────────────────────────────────────────────────────────

@router.get("/performance")
async def performance_report(
    request: Request,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    tenant_id: Optional[str] = Query(None),
):
    """
    KPIs de performance: latencia p50/p95, tasa de éxito, iteraciones.
    """
    api_key = _get_api_key(request)
    if not tenant_id:
        tenant_id = _get_tenant_id(api_key)

    end_dt = datetime.fromisoformat(end_date) if end_date else datetime.utcnow()
    start_dt = datetime.fromisoformat(start_date) if start_date else end_dt - timedelta(days=30)

    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        COUNT(*) AS total,
                        COUNT(*) FILTER (WHERE success = true) AS successes,
                        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_duration_ms) AS p50,
                        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_duration_ms) AS p95,
                        ROUND(AVG(iterations)::numeric, 2) AS avg_iter,
                        MAX(iterations) AS max_iter
                    FROM agent_request_traces
                    WHERE tenant_id = %s AND created_at BETWEEN %s AND %s
                    """,
                    (tenant_id, start_dt, end_dt),
                )
                r = cur.fetchone()
                total = r[0] or 0
                successes = r[1] or 0

        return {
            "tenant_id": tenant_id,
            "period": {"start": str(start_dt.date()), "end": str(end_dt.date())},
            "kpis": {
                "total_queries": total,
                "success_rate_pct": round(successes / max(total, 1) * 100, 1),
                "latency_p50_ms": float(r[2]) if r[2] else 0,
                "latency_p95_ms": float(r[3]) if r[3] else 0,
                "avg_iterations": float(r[4]) if r[4] else 0,
                "max_iterations": r[5] or 0,
            },
        }
    except Exception as e:
        logger.error("performance_report error: %s", e)
        raise HTTPException(500, f"Error generando reporte: {e}")


# ── CSV export ────────────────────────────────────────────────────────────────

@router.get("/export/csv")
async def export_csv(
    request: Request,
    report_type: str = Query("usage", description="usage | performance | traces"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    tenant_id: Optional[str] = Query(None),
):
    """Descarga CSV del reporte solicitado."""
    api_key = _get_api_key(request)
    if not tenant_id:
        tenant_id = _get_tenant_id(api_key)

    end_dt = datetime.fromisoformat(end_date) if end_date else datetime.utcnow()
    start_dt = datetime.fromisoformat(start_date) if start_date else end_dt - timedelta(days=30)

    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                if report_type == "traces":
                    cur.execute(
                        """
                        SELECT id, created_at, query, total_duration_ms, iterations, success
                        FROM agent_request_traces
                        WHERE tenant_id = %s AND created_at BETWEEN %s AND %s
                        ORDER BY created_at DESC
                        LIMIT 10000
                        """,
                        (tenant_id, start_dt, end_dt),
                    )
                    headers = ["id", "fecha", "query", "duracion_ms", "iteraciones", "exito"]
                else:
                    cur.execute(
                        """
                        SELECT
                            DATE(created_at) AS day,
                            COUNT(*) AS total,
                            COUNT(*) FILTER (WHERE success = false) AS errors,
                            ROUND(AVG(total_duration_ms)::numeric, 0) AS avg_ms
                        FROM agent_request_traces
                        WHERE tenant_id = %s AND created_at BETWEEN %s AND %s
                        GROUP BY DATE(created_at) ORDER BY day
                        """,
                        (tenant_id, start_dt, end_dt),
                    )
                    headers = ["fecha", "queries", "errores", "latencia_promedio_ms"]

                rows = cur.fetchall()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(headers)
        for row in rows:
            writer.writerow([str(c) if c is not None else "" for c in row])

        filename = f"{report_type}_{tenant_id[:8]}_{start_dt.date()}_{end_dt.date()}.csv"
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:
        logger.error("export_csv error: %s", e)
        raise HTTPException(500, f"Error exportando CSV: {e}")
