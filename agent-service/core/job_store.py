import json
import logging
from typing import Any, Optional

from psycopg2.extras import RealDictCursor

from core.database import get_conn

logger = logging.getLogger(__name__)


def ensure_scraper_jobs_table() -> None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS scraper_jobs (
                    id text PRIMARY KEY,
                    tenant_id text NOT NULL,
                    query text NOT NULL,
                    location text NOT NULL,
                    max_leads integer NOT NULL,
                    provider text NOT NULL,
                    source text NOT NULL DEFAULT 'manual',
                    schedule_id text NULL,
                    status text NOT NULL,
                    leads_found integer NOT NULL DEFAULT 0,
                    leads_ingested integer NOT NULL DEFAULT 0,
                    errors jsonb NOT NULL DEFAULT '[]'::jsonb,
                    message text NOT NULL DEFAULT '',
                    apify_run_id text NULL,
                    created_at timestamptz NOT NULL DEFAULT now(),
                    updated_at timestamptz NOT NULL DEFAULT now(),
                    completed_at timestamptz NULL
                )
            """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_scraper_jobs_tenant_created_at
                ON scraper_jobs (tenant_id, created_at DESC)
            """
            )
            conn.commit()


def ensure_scraper_schedules_table() -> None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS scraper_schedules (
                    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                    tenant_id text NOT NULL,
                    query text NOT NULL,
                    location text NOT NULL,
                    max_leads integer NOT NULL DEFAULT 50,
                    provider text NOT NULL DEFAULT 'google',
                    frequency_minutes integer NULL,
                    specific_time time NULL,
                    is_active boolean NOT NULL DEFAULT true,
                    last_run timestamptz NULL,
                    created_at timestamptz NOT NULL DEFAULT now(),
                    updated_at timestamptz NOT NULL DEFAULT now()
                )
            """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_scraper_schedules_tenant
                ON scraper_schedules (tenant_id)
            """
            )
            conn.commit()


def mark_inflight_jobs_interrupted() -> int:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE scraper_jobs
                SET status = 'FAILED',
                    message = CASE
                        WHEN message = '' THEN 'Interrupted by service restart'
                        ELSE message || ' | Interrupted by service restart'
                    END,
                    updated_at = now(),
                    completed_at = now()
                WHERE status IN ('PENDING', 'RUNNING')
            """
            )
            affected = cur.rowcount or 0
            conn.commit()
            return affected


def save_job_state(
    *,
    job: Any,
    provider: str,
    source: str = "manual",
    schedule_id: Optional[str] = None,
) -> None:
    errors = job.errors if isinstance(job.errors, list) else []
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO scraper_jobs (
                    id,
                    tenant_id,
                    query,
                    location,
                    max_leads,
                    provider,
                    source,
                    schedule_id,
                    status,
                    leads_found,
                    leads_ingested,
                    errors,
                    message,
                    apify_run_id
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s::jsonb, %s, %s
                )
                ON CONFLICT (id) DO UPDATE
                SET status = EXCLUDED.status,
                    leads_found = EXCLUDED.leads_found,
                    leads_ingested = EXCLUDED.leads_ingested,
                    errors = EXCLUDED.errors,
                    message = EXCLUDED.message,
                    apify_run_id = EXCLUDED.apify_run_id,
                    provider = EXCLUDED.provider,
                    source = EXCLUDED.source,
                    schedule_id = EXCLUDED.schedule_id,
                    updated_at = now(),
                    completed_at = CASE
                        WHEN EXCLUDED.status IN ('COMPLETED', 'FAILED') THEN now()
                        ELSE scraper_jobs.completed_at
                    END
            """,
                (
                    job.job_id,
                    job.tenant_id,
                    job.query,
                    job.location,
                    job.max_leads,
                    provider,
                    source,
                    schedule_id,
                    job.status,
                    job.leads_found,
                    job.leads_ingested,
                    json.dumps(errors),
                    job.message or "",
                    job.apify_run_id,
                ),
            )
            conn.commit()


def get_job(job_id: str) -> Optional[dict[str, Any]]:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, tenant_id, query, location, max_leads, provider, source, schedule_id,
                       status, leads_found, leads_ingested, errors, message, apify_run_id,
                       created_at, updated_at, completed_at
                FROM scraper_jobs
                WHERE id = %s
            """,
                (job_id,),
            )
            return cur.fetchone()


def list_jobs(limit: int = 200) -> list[dict[str, Any]]:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, tenant_id, query, location, max_leads, provider, source, schedule_id,
                       status, leads_found, leads_ingested, errors, message, apify_run_id,
                       created_at, updated_at, completed_at
                FROM scraper_jobs
                ORDER BY created_at DESC
                LIMIT %s
            """,
                (limit,),
            )
            return cur.fetchall()
