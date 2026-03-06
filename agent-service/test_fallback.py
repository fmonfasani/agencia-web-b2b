import asyncio
import os
import sys

# Agregar el directorio actual al path para importar
sys.path.append(os.getcwd())

from services.scraper_service import FallbackScraper, ScraperJob

async def test_fallback():
    print("--- Test de Fallback Scraper ---")
    scraper = FallbackScraper(primary_provider="apify")
    
    # Creamos un job de prueba
    job = ScraperJob(
        job_id="test-job-fallback",
        query="test",
        location="test",
        tenant_id="test",
        max_leads=5
    )
    
    # Simulamos el registro de jobs
    registry = {job.job_id: job}
    
    print(f"Iniciando scraping con fallback (Primario: Apify)...")
    await scraper.run_and_ingest(job, registry)
    
    print("\n--- Resultado Final ---")
    print(f"Status: {job.status}")
    print(f"Message: {job.message}")
    print(f"Leads Found: {job.leads_found}")
    print(f"Errors: {job.errors}")

if __name__ == "__main__":
    asyncio.run(test_fallback())
