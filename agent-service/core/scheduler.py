from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
import logging
from datetime import datetime, timedelta
import asyncio
from typing import List, Optional

from services.scraper_service import GoogleMapsScraper, ApifyScraper
from core.database import get_conn
import json
import httpx

logger = logging.getLogger(__name__)

# Barrios de Buenos Aires para rotación
BA_NEIGHBORHOODS = [
    "Palermo", "Recoleta", "Belgrano", "Almagro", "Caballito", 
    "Villa Urquiza", "Colegiales", "San Telmo", "Puerto Madero",
    "Flores", "Villa Crespo", "Chacarita", "Nuñez", "Balvanera"
]

class ScraperScheduler:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self._running_jobs = {}

    def start(self):
        if not self.scheduler.running:
            self.scheduler.start()
            logger.info("Scheduler iniciado")
            # Cargar jobs activos de la DB
            asyncio.create_task(self.load_active_schedules())

    async def load_active_schedules(self):
        try:
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT * FROM scraper_schedules WHERE active = true")
                    schedules = cur.fetchall()
                    for sched in schedules:
                        self.add_job_to_scheduler(sched)
            logger.info(f"Cargados {len(schedules)} schedules activos")
        except Exception as e:
            logger.error(f"Error cargando schedules: {e}")

    def add_job_to_scheduler(self, sched: dict):
        job_id = str(sched['id'])
        
        # Determinar el trigger
        if sched['frequency_minutes']:
            trigger = IntervalTrigger(minutes=sched['frequency_minutes'])
        elif sched['specific_time']:
            t = sched['specific_time']
            trigger = CronTrigger(hour=t.hour, minute=t.minute)
        else:
            return

        # Eliminar si ya existe
        if job_id in self._running_jobs:
            self.scheduler.remove_job(job_id)

        self.scheduler.add_job(
            self.run_scheduled_scrape,
            trigger,
            id=job_id,
            args=[sched],
            replace_existing=True,
            next_run_time=datetime.now()
        )
        self._running_jobs[job_id] = True

    async def run_scheduled_scrape(self, sched: dict):
        logger.info(f"Ejecutando scrape programado: {sched['id']} - {sched['query']}")
        
        # Lógica de rotación de barrios para BA
        search_query = sched['query']
        location = sched['location']
        
        if "Buenos Aires" in location:
            neighborhood = BA_NEIGHBORHOODS[sched['neighborhood_index'] % len(BA_NEIGHBORHOODS)]
            location_with_neighborhood = f"{neighborhood}, Buenos Aires, Argentina"
            logger.info(f"Rotación BA: Usando barrio {neighborhood}")
            
            # Actualizar índice para la próxima vez
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE scraper_schedules SET neighborhood_index = neighborhood_index + 1, last_run_at = now() WHERE id = %s",
                        (sched['id'],)
                    )
                    conn.commit()
        else:
            location_with_neighborhood = location
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("UPDATE scraper_schedules SET last_run_at = now() WHERE id = %s", (sched['id'],))
                    conn.commit()

        # Ejecutar el scraper
        try:
            # Re-instanciar el scraper adecuado
            if sched['provider'] == 'google':
                from core.config import settings
                scraper = GoogleMapsScraper(settings.google_maps_api_key)
            else:
                from core.config import settings
                scraper = ApifyScraper(settings.apify_api_token)

            # Lanzar en background para no bloquear el scheduler
            asyncio.create_task(scraper.run(
                query=search_query,
                location=location_with_neighborhood,
                max_leads=sched['max_leads'],
                tenant_id=sched['tenant_id']
            ))
            
        except Exception as e:
            logger.error(f"Error en ejecución programada {sched['id']}: {e}")

scraper_scheduler = ScraperScheduler()
