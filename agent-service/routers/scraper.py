"""
Scraper Router - Google Maps Lead Extraction via Apify
Llama a Apify's Google Maps Scraper Actor y luego envía los resultados
al endpoint /api/leads/ingest del frontend Next.js.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from core.auth import require_admin
from services.scraper_service import ApifyScraper, ScraperJob

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/scraper", tags=["scraper"])


class ScrapeRequest(BaseModel):
    """Modelo de request para lanzar un job de scraping."""
    query: str           # Ej: "dentistas Buenos Aires"
    location: str        # Ej: "Buenos Aires, Argentina"
    max_leads: int = 50  # Límite de leads a extraer
    tenant_id: str       # ID del tenant que recibirá los leads
    language: str = "es" # Idioma de búsqueda


class ScrapeStatusResponse(BaseModel):
    job_id: str
    status: str
    leads_found: int = 0
    leads_ingested: int = 0
    message: str = ""


# Almacenamiento en memoria de jobs activos (en producción usar Redis)
active_jobs: dict[str, ScraperJob] = {}


@router.post("/run", dependencies=[Depends(require_admin)])
async def run_scraper(body: ScrapeRequest, background_tasks: BackgroundTasks):
    """
    Lanza un job de scraping de Google Maps en segundo plano.
    Los resultados se envían automáticamente a /api/leads/ingest.
    """
    scraper = ApifyScraper()

    # Crear el job
    job = await scraper.create_job(
        query=body.query,
        location=body.location,
        max_leads=body.max_leads,
        tenant_id=body.tenant_id,
        language=body.language,
    )

    # Guardar el job
    active_jobs[job.job_id] = job

    # Ejecutar en background para no bloquear la respuesta
    background_tasks.add_task(scraper.run_and_ingest, job, active_jobs)

    logger.info(f"[Scraper] Job {job.job_id} lanzado para query='{body.query}' location='{body.location}'")

    return {
        "job_id": job.job_id,
        "status": "RUNNING",
        "message": f"Scraping iniciado para '{body.query}' en '{body.location}'. Máximo {body.max_leads} leads.",
        "estimated_time_seconds": min(body.max_leads * 2, 180),
    }


@router.get("/status/{job_id}", dependencies=[Depends(require_admin)])
async def get_job_status(job_id: str):
    """Consulta el estado de un job de scraping activo."""
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
    """Lista todos los jobs de scraping activos en esta sesión."""
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
