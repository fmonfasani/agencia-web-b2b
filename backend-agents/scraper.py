"""
Scraper Router - Google Maps Lead Extraction via Apify/Google.
"""
import logging
from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from core.auth import require_admin
from core.job_store import get_job, list_jobs as list_persisted_jobs, save_job_state
from services.scraper_service import FallbackScraper, ScraperJob

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/scraper", tags=["scraper"])


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


async def _run_scraper_job(scraper: FallbackScraper, job: ScraperJob, provider: str) -> None:
    await scraper.run_and_ingest(job, {})
    save_job_state(job=job, provider=provider, source="manual")


@router.post("/run", dependencies=[Depends(require_admin)])
async def run_scraper(body: ScrapeRequest, background_tasks: BackgroundTasks):
    scraper = FallbackScraper(primary_provider=body.provider)

    job = await scraper.create_job(
        query=body.query,
        location=body.location,
        max_leads=body.max_leads,
        tenant_id=body.tenant_id,
    )

    job.status = "RUNNING"
    job.message = "Scraping encolado."
    save_job_state(job=job, provider=body.provider, source="manual")

    background_tasks.add_task(_run_scraper_job, scraper, job, body.provider)

    logger.info("[Scraper] Job %s (%s) lanzado para query='%s'", job.job_id, body.provider, body.query)

    return {
        "job_id": job.job_id,
        "status": "RUNNING",
        "provider": body.provider,
        "message": f"Scraping ({body.provider}) iniciado para '{body.query}'.",
    }


@router.get("/status/{job_id}", dependencies=[Depends(require_admin)])
async def get_job_status(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' no encontrado.")

    return {
        "job_id": job["id"],
        "status": job["status"],
        "query": job["query"],
        "leads_found": job["leads_found"],
        "leads_ingested": job["leads_ingested"],
        "errors": job["errors"],
        "message": job["message"],
        "provider": job["provider"],
        "source": job["source"],
        "created_at": job["created_at"],
        "updated_at": job["updated_at"],
        "completed_at": job["completed_at"],
    }


@router.get("/jobs", dependencies=[Depends(require_admin)])
async def list_jobs():
    jobs = list_persisted_jobs()
    return [
        {
            "job_id": job["id"],
            "query": job["query"],
            "status": job["status"],
            "provider": job["provider"],
            "source": job["source"],
            "leads_found": job["leads_found"],
            "leads_ingested": job["leads_ingested"],
            "created_at": job["created_at"],
            "updated_at": job["updated_at"],
        }
        for job in jobs
    ]
