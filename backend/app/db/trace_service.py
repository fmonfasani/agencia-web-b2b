"""
Trace persistence service.
Persists agent execution traces to agent_request_traces table.
Never raises — failures are logged and silently dropped.
"""
import json
import logging
import os
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

_DSN = os.getenv(
    "POSTGRES_PRISMA_URL",
    "postgresql://postgres:Karaoke27570Echeverria@localhost:5432/agencia_web_b2b",
)

MAX_ITERATIONS = 5


_VALID_FINISH_REASONS = {
    "results_found",    # éxito real — tool retornó resultados accionables
    "rag_only",         # RAG encontró hits pero ninguna tool confirmó resultados — valor parcial
    "no_results",       # LLM terminó correctamente, sin datos disponibles
    "forced_stop",      # scrape bloqueado por ausencia de URL
    "max_iterations",   # agotó el límite
    "loop_detected",    # misma tool dos veces
    "llm_error",        # excepción en el LLM call
    "embedding_error",  # embedding fallback activado — vector constante, resultados sin sentido
}


def _sanitize_finish_reason(data: Dict[str, Any]) -> str:
    """
    Use finish_reason from planner if valid; fall back to derivation.
    Planner is source of truth — this is a safety net for error paths.
    """
    reason = data.get("finish_reason", "")
    if reason in _VALID_FINISH_REASONS:
        return reason
    if data.get("error") is not None:
        return "llm_error"
    if data.get("iterations", 0) >= MAX_ITERATIONS:
        return "max_iterations"
    if data.get("results_count", 0) > 0:
        return "results_found"
    return "forced_stop"


async def persist_trace(data: Dict[str, Any]) -> None:
    """
    Persist a single agent trace row.
    Called from BackgroundTasks — must never block or raise.

    Expected keys in data:
        request_id, tenant_id, task, model,
        iterations, llm_calls, tools_executed, results_count,
        total_ms, embedding_ms, rag_ms, llm_ms,
        tokens_used, finish_reason, error
    """
    try:
        import psycopg2  # sync driver — fine for background task

        finish_reason = _sanitize_finish_reason(data)
        had_error = data.get("error") is not None
        error_msg: Optional[str] = (str(data["error"])[:500] if had_error else None)

        conn = psycopg2.connect(_DSN)
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO agent_request_traces (
                        request_id, tenant_id, task, model,
                        iterations, llm_calls, tools_executed, results_count,
                        total_ms, embedding_ms, rag_ms, llm_ms, tokens_used,
                        finish_reason, had_error, error_message, success
                    ) VALUES (
                        %s, %s, %s, %s,
                        %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s
                    )
                    """,
                    (
                        data.get("request_id"),
                        data.get("tenant_id"),
                        data.get("task"),
                        data.get("model", "qwen2.5:0.5b"),
                        data.get("iterations", 0),
                        data.get("llm_calls", 0),
                        json.dumps(data.get("tools_executed", [])),
                        data.get("results_count", 0),
                        data.get("total_ms"),
                        data.get("embedding_ms"),
                        data.get("rag_ms"),
                        data.get("llm_ms"),
                        data.get("tokens_used", 0),
                        finish_reason,
                        had_error,
                        error_msg,
                        not had_error,
                    ),
                )
                conn.commit()
            logger.debug(
                "Trace persisted",
                extra={
                    "request_id": data.get("request_id"),
                    "finish_reason": finish_reason,
                    "iterations": data.get("iterations"),
                    "llm_calls": data.get("llm_calls"),
                    "total_ms": data.get("total_ms"),
                },
            )
        finally:
            conn.close()

    except Exception as exc:
        # Non-fatal: agent response is already sent; just log and move on
        logger.warning(f"persist_trace failed (non-fatal): {exc}")


def ensure_traces_table() -> None:
    """
    Run all migrations in order at application startup.
    Safe to call multiple times — all migrations use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
    """
    migrations = [
        "001_agent_traces.sql",
        "002_add_trace_timing_columns.sql",
    ]
    try:
        import psycopg2

        migrations_dir = os.path.join(os.path.dirname(__file__), "migrations")
        conn = psycopg2.connect(_DSN)
        try:
            for filename in migrations:
                sql_path = os.path.join(migrations_dir, filename)
                with open(sql_path) as f:
                    ddl = f.read()
                with conn.cursor() as cur:
                    cur.execute(ddl)
                conn.commit()
                logger.info(f"Migration applied: {filename}")
        finally:
            conn.close()
    except Exception as exc:
        # DB might not be available in all environments — non-fatal
        logger.warning(f"ensure_traces_table failed (non-fatal): {exc}")
