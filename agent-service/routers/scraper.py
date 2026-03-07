"""
Scraper Router - Google Maps Lead Extraction via Apify.
"""
import json
import logging
from dataclasses import asdict
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from core.auth import require_admin
from services.scraper_service import FallbackScraper, ScraperJob

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/scraper", tags=["scraper"])
JOBS_STORE = Path("tmp/agent-service-scraper-jobs.json")


class ScrapeRequest(BaseModel):
    query: str
    location: str
    max_leads: int = 50
    tenant_id: str
    language: str = "es"
    provider: Literal["apify", "google"] = "apify"


class ScrapeStatusResponse(BaseModel):
    job_id: str
    status: str
    leads_found: int = 0
    leads_ingested: int = 0
    message: str = ""


def _save_jobs() -> None:
    JOBS_STORE.parent.mkdir(parents=True, exist_ok=True)
    payload = {job_id: asdict(job) for job_id, job in active_jobs.items()}
    JOBS_STORE.write_text(json.dumps(payload), encoding="utf-8")


def _load_jobs() -> dict[str, ScraperJob]:
    if not JOBS_STORE.exists():
        return {}
    try:
        raw = json.loads(JOBS_STORE.read_text(encoding="utf-8"))
        restored: dict[str, ScraperJob] = {}
        for job_id, item in raw.items():
            restored[job_id] = ScraperJob(**item)
        return restored
    except Exception as exc:
        logger.warning("Could not restore scraper jobs store: %s", exc)
        return {}


active_jobs: dict[str, ScraperJob] = _load_jobs()


async def _run_scraper_job(scraper: FallbackScraper, job: ScraperJob) -> None:
    await scraper.run_and_ingest(job, active_jobs)
    _save_jobs()


@router.post("/run", dependencies=[Depends(require_admin)])
async def run_scraper(body: ScrapeRequest, background_tasks: BackgroundTasks):
    scraper = FallbackScraper(primary_provider=body.provider)

    job = await scraper.create_job(
        query=body.query,
        location=body.location,
        max_leads=body.max_leads,
        tenant_id=body.tenant_id,
    )

    active_jobs[job.job_id] = job
    _save_jobs()

    background_tasks.add_task(_run_scraper_job, scraper, job)

    logger.info("[Scraper] Job %s (%s) lanzado para query='%s'", job.job_id, body.provider, body.query)

    return {
        "job_id": job.job_id,
        "status": "RUNNING",
        "provider": body.provider,
        "message": f"Scraping ({body.provider}) iniciado para '{body.query}'.",
    }


@router.get("/status/{job_id}", dependencies=[Depends(require_admin)])
async def get_job_status(job_id: str):
    job = active_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' no encontrado.")

    return {
        "job_id": job.job_id,
        "status": job.status,
        "query": job.query,
        "leads_found": job.leads_found,
        "leads_ingested": job.leads_ingested,
        "errors": job.errors,
        "message": job.message,
    }


@router.get("/jobs", dependencies=[Depends(require_admin)])
async def list_jobs():
    return [
        {
            "job_id": j.job_id,
            "query": j.query,
            "status": j.status,
            "leads_found": j.leads_found,
            "leads_ingested": j.leads_ingested,
        }
        for j in active_jobs.values()
    ]
