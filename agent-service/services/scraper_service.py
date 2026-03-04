"""
ApifyScraper Service - Google Maps Lead Extraction
Usa la API de Apify para ejecutar el actor 'compass/crawler-google-places'
y envía los resultados al endpoint de leads/ingest de Next.js.
"""
import uuid
import logging
import asyncio
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime

import httpx
from core.config import settings

logger = logging.getLogger(__name__)

# Actor de Apify para Google Maps (el más popular y actualizado)
APIFY_ACTOR_ID = "compass~crawler-google-places"
APIFY_BASE_URL = "https://api.apify.com/v2"


@dataclass
class ScraperJob:
    """Representa un job de scraping en ejecución."""
    job_id: str
    query: str
    location: str
    tenant_id: str
    max_leads: int
    status: str = "PENDING"  # PENDING | RUNNING | COMPLETED | FAILED
    leads_found: int = 0
    leads_ingested: int = 0
    errors: list = field(default_factory=list)
    message: str = ""
    apify_run_id: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())


class ApifyScraper:
    """
    Cliente para Apify Google Maps Scraper.
    Requiere APIFY_API_TOKEN en el .env del agent-service.
    Requiere NEXTJS_INTERNAL_URL para hacer el ingest de leads.
    """

    def __init__(self):
        self.api_token = getattr(settings, "apify_api_token", None)
        # URL interna de la app Next.js (ej: http://localhost:3000 o https://tu-dominio.com)
        self.nextjs_url = getattr(settings, "nextjs_internal_url", "http://localhost:3000")
        self.ingest_url = f"{self.nextjs_url}/api/leads/ingest"
        # Token de autenticación de la API interna de Next.js
        self.internal_api_secret = getattr(settings, "internal_api_secret", None)

    async def create_job(
        self,
        query: str,
        location: str,
        max_leads: int,
        tenant_id: str,
        language: str = "es",
    ) -> ScraperJob:
        """Crea un nuevo job de scraping (sin ejecutarlo todavía)."""
        return ScraperJob(
            job_id=str(uuid.uuid4()),
            query=query,
            location=location,
            tenant_id=tenant_id,
            max_leads=max_leads,
        )

    async def run_and_ingest(self, job: ScraperJob, jobs_registry: dict):
        """
        Función principal (ejecutada en background):
        1. Llama a Apify para extraer negocios de Google Maps
        2. Envía cada lead al endpoint /api/leads/ingest de Next.js
        """
        try:
            job.status = "RUNNING"
            job.message = "Conectando con Apify..."

            if not self.api_token:
                raise ValueError("APIFY_API_TOKEN no está configurado en el .env del agent-service.")

            # 1. Lanzar el actor de Apify
            places = await self._run_apify_actor(job)
            job.leads_found = len(places)
            job.message = f"Encontrados {len(places)} negocios. Procesando..."

            logger.info(f"[Scraper Job {job.job_id}] Apify devolvió {len(places)} lugares.")

            # 2. Ingestar cada lead en Next.js
            ingested = 0
            for place in places:
                try:
                    success = await self._ingest_lead(place, job.tenant_id)
                    if success:
                        ingested += 1
                except Exception as e:
                    job.errors.append(str(e))
                    logger.warning(f"[Scraper Job {job.job_id}] Error ingesting lead: {e}")

                # Pequeña pausa para no saturar el rate limit del endpoint
                await asyncio.sleep(0.1)

            job.leads_ingested = ingested
            job.status = "COMPLETED"
            job.message = f"✅ Completado: {ingested}/{len(places)} leads ingresados al CRM."

            logger.info(f"[Scraper Job {job.job_id}] Completado. {ingested}/{len(places)} leads ingresados.")

        except Exception as e:
            job.status = "FAILED"
            job.message = f"❌ Error: {str(e)}"
            job.errors.append(str(e))
            logger.error(f"[Scraper Job {job.job_id}] FAILED: {e}", exc_info=True)

    async def _run_apify_actor(self, job: ScraperJob) -> list[dict]:
        """
        Ejecuta el actor de Apify y espera a que termine.
        Retorna la lista de lugares extraídos de Google Maps.
        """
        async with httpx.AsyncClient(timeout=180.0) as client:
            # Input del actor (ver docs: https://apify.com/compass/crawler-google-places)
            actor_input = {
                "searchStringsArray": [f"{job.query} {job.location}"],
                "maxCrawledPlacesPerSearch": job.max_leads,
                "language": job.language if hasattr(job, "language") else "es",
                "includeWebResults": False,
                "exportPlaceUrls": True,
                "additionalInfo": True,
                "maxImages": 0,        # No necesitamos imágenes para leads
                "maxReviews": 0,       # No necesitamos reviews
                "scrapingOptions": {
                    "scrapeReviewerInfo": False,
                },
            }

            # Iniciar el run del actor (modo síncrono con waiter)
            logger.info(f"[Scraper] Lanzando actor Apify con input: {actor_input}")
            run_response = await client.post(
                f"{APIFY_BASE_URL}/acts/{APIFY_ACTOR_ID}/run-sync-get-dataset-items",
                params={"token": self.api_token, "timeout": 120},
                json=actor_input,
                headers={"Content-Type": "application/json"},
            )

            if run_response.status_code == 200:
                return run_response.json()

            # Si falla el modo síncrono, intentamos el modo asíncrono
            logger.warning(f"[Scraper] Modo síncrono falló ({run_response.status_code}), usando modo async...")
            return await self._run_async_with_polling(client, actor_input, job)

    async def _run_async_with_polling(
        self,
        client: httpx.AsyncClient,
        actor_input: dict,
        job: ScraperJob,
    ) -> list[dict]:
        """Alternativa: lanza el actor y hace polling hasta obtener resultados."""
        # Lanzar run
        run_resp = await client.post(
            f"{APIFY_BASE_URL}/acts/{APIFY_ACTOR_ID}/runs",
            params={"token": self.api_token},
            json=actor_input,
        )
        run_resp.raise_for_status()
        run_data = run_resp.json()
        run_id = run_data["data"]["id"]
        job.apify_run_id = run_id
        job.message = f"Actor Apify corriendo (run_id: {run_id})..."

        # Polling cada 10 segundos hasta que termine
        for attempt in range(24):  # máx 4 minutos
            await asyncio.sleep(10)
            status_resp = await client.get(
                f"{APIFY_BASE_URL}/actor-runs/{run_id}",
                params={"token": self.api_token},
            )
            run_status = status_resp.json()["data"]["status"]
            logger.info(f"[Scraper] Apify run {run_id} status: {run_status}")

            if run_status == "SUCCEEDED":
                break
            if run_status in ("FAILED", "TIMED-OUT", "ABORTED"):
                raise RuntimeError(f"Apify actor terminó con estado: {run_status}")

        # Obtener los resultados del dataset
        dataset_id = run_resp.json()["data"]["defaultDatasetId"]
        dataset_resp = await client.get(
            f"{APIFY_BASE_URL}/datasets/{dataset_id}/items",
            params={"token": self.api_token, "format": "json"},
        )
        dataset_resp.raise_for_status()
        return dataset_resp.json()

    async def _ingest_lead(self, place: dict, tenant_id: str) -> bool:
        """
        Envía un lugar de Google Maps al endpoint /api/leads/ingest de Next.js.
        Mapea los campos de Apify al schema de LeadIngestInput.
        """
        # Mapeo de campos de Apify al schema de tu app
        lead_payload = {
            "sourceType": "SCRAPER",
            "name": place.get("title") or place.get("name"),
            "phone": place.get("phone") or place.get("phoneUnformatted"),
            "website": place.get("website"),
            "address": place.get("address") or place.get("street"),
            "category": place.get("categoryName") or place.get("categories", [None])[0],
            "rating": place.get("totalScore") or place.get("rating"),
            "reviewsCount": place.get("reviewsCount") or place.get("userRatingsTotal"),
            "googlePlaceId": place.get("placeId"),
            "googleMapsUrl": place.get("url") or place.get("permanentlyClosed"),
            "description": place.get("description"),
            "rawMetadata": place,
        }

        # Quitar campos None para no contaminar el schema
        lead_payload = {k: v for k, v in lead_payload.items() if v is not None}

        # Headers de autenticación interna
        headers = {"Content-Type": "application/json"}
        if self.internal_api_secret:
            headers["X-Internal-Secret"] = self.internal_api_secret
        # Pasar el tenantId como header para resolveTenantIdFromHeaders
        headers["X-Tenant-Id"] = tenant_id

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                self.ingest_url,
                json=lead_payload,
                headers=headers,
            )

            if response.status_code in (200, 201):
                return True

            logger.warning(
                f"[Scraper] Ingest falló para '{lead_payload.get('name')}': "
                f"{response.status_code} - {response.text[:200]}"
            )
            return False
