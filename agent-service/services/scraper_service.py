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


class BaseScraper:
    """Clase base con lógica común para todos los scrapers."""
    _shared_client: httpx.AsyncClient | None = None

    def __init__(self):
        # URL interna de la app Next.js
        self.nextjs_url = getattr(settings, "nextjs_internal_url", "http://localhost:3000")
        self.ingest_url = f"{self.nextjs_url}/api/leads/ingest"
        # Token de autenticación de la API interna de Next.js
        self.internal_api_secret = getattr(settings, "internal_api_secret", None)
        # Semáforo para limitar concurrencia de ingesta/análisis (evita picos de CPU)
        self._ingest_semaphore = asyncio.Semaphore(5)

    @classmethod
    def _get_shared_client(cls) -> httpx.AsyncClient:
        if cls._shared_client is None:
            cls._shared_client = httpx.AsyncClient(timeout=30.0)
        return cls._shared_client

    async def _ingest_lead(self, place: dict, tenant_id: str) -> bool:
        """Envía un lead al endpoint /api/leads/ingest de Next.js."""
        async with self._ingest_semaphore:
            # Detectar si el payload viene de Apify o de Google Places API (New)
            # Mapeo unificado de campos
            lead_payload = {
                "sourceType": "SCRAPER",
                "name": place.get("title") or place.get("displayName", {}).get("text") or place.get("name"),
                "phone": place.get("phone") or place.get("internationalPhoneNumber") or place.get("nationalPhoneNumber"),
                "website": place.get("website") or place.get("websiteUri"),
                "address": place.get("address") or place.get("formattedAddress") or place.get("location", {}).get("address"),
                "category": place.get("categoryName") or (place.get("types", [None])[0] if place.get("types") else None),
                "rating": place.get("totalScore") or place.get("rating"),
                "reviewsCount": place.get("reviewsCount") or place.get("userRatingCount"),
                "googlePlaceId": place.get("placeId") or place.get("id"),
                "googleMapsUrl": place.get("url") or place.get("googleMapsUri"),
                "rawMetadata": place,
            }

            lead_payload = {k: v for k, v in lead_payload.items() if v is not None}

            headers = {"Content-Type": "application/json"}
            if self.internal_api_secret:
                headers["X-Internal-Secret"] = self.internal_api_secret
            headers["X-Tenant-Id"] = tenant_id

            client = self._get_shared_client()
            try:
                response = await client.post(
                    self.ingest_url,
                    json=lead_payload,
                    headers=headers,
                    timeout=15.0,
                )
                if response.status_code not in (200, 201):
                    logger.error(f"[Ingest] FAILED: Status {response.status_code}, Body: {response.text}")
                return response.status_code in (200, 201)
            except Exception as e:
                logger.error(f"[Ingest] CRITICAL Error: {e}")
                return False

    async def _report_failure(self, tenant_id: str, error_msg: str, detail: Optional[str] = None):
        """Reporta un fallo crítico de negocio (402, 403, etc) al dashboard."""
        url = f"{self.nextjs_url}/api/admin/metrics/log"
        headers = {
            "Content-Type": "application/json",
            "X-Internal-Secret": self.internal_api_secret or ""
        }
        payload = {
            "tenantId": tenant_id,
            "type": "EXTRACTION_FAILURE",
            "status": "FAILURE",
            "metadata": {
                "error": error_msg,
                "detail": detail,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        client = self._get_shared_client()
        try:
            await client.post(url, json=payload, headers=headers, timeout=5.0)
            logger.info(f"[Scraper] Reported critical failure: {error_msg}")
        except Exception as e:
            logger.error(f"[Scraper] Failed to report failure to dashboard: {e}")


class ApifyScraper(BaseScraper):
    """Scraper que usa la API de Apify."""

    def __init__(self):
        super().__init__()
        self.api_token = getattr(settings, "apify_api_token", None)

    async def create_job(self, query: str, location: str, max_leads: int, tenant_id: str) -> ScraperJob:
        return ScraperJob(
            job_id=str(uuid.uuid4()),
            query=query,
            location=location,
            tenant_id=tenant_id,
            max_leads=max_leads,
        )

    async def run_and_ingest(self, job: ScraperJob, jobs_registry: dict):
        try:
            job.status = "RUNNING"
            job.message = "Conectando con Apify..."

            if not self.api_token:
                raise ValueError("APIFY_API_TOKEN no configurado.")

            places = await self._run_apify_actor(job)
            job.leads_found = len(places)
            job.message = f"Encontrados {len(places)} negocios. Procesando..."

            ingested = 0
            for place in places:
                if await self._ingest_lead(place, job.tenant_id):
                    ingested += 1
                await asyncio.sleep(0.05)

            job.leads_ingested = ingested
            job.status = "COMPLETED"
            job.message = f"✅ Completado: {ingested}/{len(places)} leads ingresados."

        except Exception as e:
            job.status = "FAILED"
            job.message = f"❌ Error: {str(e)}"
            job.errors.append(str(e))
            logger.error(f"[ApifyScraper] FAILED: {e}")

    async def _run_apify_actor(self, job: ScraperJob) -> list[dict]:
        client = self._get_shared_client()
        actor_input = {
            "searchStringsArray": [f"{job.query} {job.location}"],
            "maxCrawledPlacesPerSearch": job.max_leads,
            "language": "es",
            "exportPlaceUrls": True,
        }
        try:
            resp = await client.post(
                f"{APIFY_BASE_URL}/acts/{APIFY_ACTOR_ID}/run-sync-get-dataset-items",
                params={"token": self.api_token, "timeout": 120},
                json=actor_input,
                timeout=180.0,
            )
            if resp.status_code == 402:
                await self._report_failure(job.tenant_id, "APIFY_BILLING_ERROR", "402 Payment Required")
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 402:
                raise Exception("Error de pago en Apify (402). Por favor revisa tu suscripción.")
            raise


class GoogleMapsScraper(BaseScraper):
    """Scraper que usa la API de Google Places directamente."""

    def __init__(self):
        super().__init__()
        self.api_key = getattr(settings, "google_maps_api_key", None)

    async def create_job(self, query: str, location: str, max_leads: int, tenant_id: str) -> ScraperJob:
        return ScraperJob(
            job_id=str(uuid.uuid4()),
            query=query,
            location=location,
            tenant_id=tenant_id,
            max_leads=max_leads,
        )

    async def run_and_ingest(self, job: ScraperJob, jobs_registry: dict):
        """Usa Google Places Text Search (New) para obtener leads."""
        try:
            job.status = "RUNNING"
            job.message = "Conectando con Google Maps API..."

            if not self.api_key:
                raise ValueError("GOOGLE_MAPS_API_KEY no configurado.")

            # 1. Buscar en Google Places
            places = await self._search_places(job)
            job.leads_found = len(places)
            job.message = f"Encontrados {len(places)} negocios en Google. Procesando..."

            # 2. Ingestar
            ingested = 0
            for place in places:
                if await self._ingest_lead(place, job.tenant_id):
                    ingested += 1
                await asyncio.sleep(0.05)

            job.leads_ingested = ingested
            job.status = "COMPLETED"
            job.message = f"✅ Completado: {ingested}/{len(places)} leads ingresados via Google API."

        except Exception as e:
            job.status = "FAILED"
            job.message = f"❌ Error Google API: {str(e)}"
            job.errors.append(str(e))
            logger.error(f"[GoogleScraper] FAILED: {e}")

    async def _search_places(self, job: ScraperJob) -> list[dict]:
        """Llamada a Google Places API (New) - Text Search."""
        url = "https://places.googleapis.com/v1/places:searchText"
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.types,places.googleMapsUri"
        }
        payload = {
            "textQuery": f"{job.query} in {job.location}",
            "maxResultCount": min(job.max_leads, 20), # Google permite máx 20 por página en New API
            "languageCode": "es"
        }

        client = self._get_shared_client()
        resp = await client.post(url, json=payload, headers=headers, timeout=30.0)
        if resp.status_code == 403:
            await self._report_failure(job.tenant_id, "GOOGLE_AUTH_ERROR", "403 Forbidden - Check API Key restrictions")
        resp.raise_for_status()
        data = resp.json()
        return data.get("places", [])


class FallbackScraper(BaseScraper):
    """Scraper inteligente que intenta con un proveedor y cae al otro si falla."""

    def __init__(self, primary_provider: str):
        super().__init__()
        self.primary_provider = primary_provider
        self.google = GoogleMapsScraper()
        self.apify = ApifyScraper()

    async def create_job(self, query: str, location: str, max_leads: int, tenant_id: str) -> ScraperJob:
        return ScraperJob(
            job_id=str(uuid.uuid4()),
            query=query,
            location=location,
            tenant_id=tenant_id,
            max_leads=max_leads,
        )

    async def run_and_ingest(self, job: ScraperJob, jobs_registry: dict):
        """Intenta con el primario, si falla o da 0, intenta con el secundario."""
        try:
            # 1. Intentar con el primario
            if self.primary_provider == "google":
                primary = self.google
                secondary = self.apify
                p_name, s_name = "Google Maps", "Apify"
            else:
                primary = self.apify
                secondary = self.google
                p_name, s_name = "Apify", "Google Maps"

            logger.info(f"[FallbackScraper] Iniciando con {p_name} para Job {job.job_id}")
            await primary.run_and_ingest(job, jobs_registry)

            # 2. Verificar si necesitamos el fallback
            # Si falló o si terminó pero encontró 0 leads
            if job.status == "FAILED" or (job.status == "COMPLETED" and job.leads_found == 0):
                logger.info(f"[FallbackScraper] {p_name} falló o dio 0. Aplicando FALLBACK a {s_name}")
                
                # Limpiar estado previo si fue un FAILED
                prev_errors = job.errors.copy()
                job.status = "RUNNING"
                job.message = f"Reintentando con {s_name} (Auto-fallback)..."
                job.errors = [] # Reset para el nuevo intento, pero guardamos log
                
                await secondary.run_and_ingest(job, jobs_registry)
                
                if job.status == "COMPLETED":
                    job.message = f"✅ Completado via {s_name} (Fallback). " + job.message
                
                # Restaurar errores previos si el secundario también falla o para historial
                if prev_errors:
                    job.errors = prev_errors + job.errors

        except Exception as e:
            job.status = "FAILED"
            job.message = f"❌ Error crítico en Fallback: {str(e)}"
            logger.error(f"[FallbackScraper] CRITICAL: {e}")
