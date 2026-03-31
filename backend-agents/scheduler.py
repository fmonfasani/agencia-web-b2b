import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from psycopg2.extras import RealDictCursor

from core.database import get_conn
from core.job_store import save_job_state
from services.scraper_service import ApifyScraper, GoogleMapsScraper

logger = logging.getLogger(__name__)

BA_NEIGHBORHOODS = [
    "Palermo",
    "Recoleta",
    "Belgrano",
    "Almagro",
    "Caballito",
    "Villa Urquiza",
    "Colegiales",
    "San Telmo",
    "Puerto Madero",
    "Flores",
    "Villa Crespo",
    "Chacarita",
    "Nunez",
    "Balvanera",
]


class ScraperScheduler:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self._running_jobs = {}

    def start(self):
        if not self.scheduler.running:
            self.scheduler.start()
            logger.info("Scheduler iniciado")
            asyncio.create_task(self.load_active_schedules())

    async def load_active_schedules(self):
        schedules = []
        try:
            with get_conn() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("SELECT * FROM scraper_schedules WHERE is_active = true")
                    schedules = cur.fetchall()

                    for i, sched in enumerate(schedules):
                        startup_delay = i * 30
                        next_run = datetime.now() + timedelta(seconds=startup_delay)
                        self.add_job_to_scheduler(sched, next_run=next_run)

            logger.info("Cargados %s schedules activos con inicio escalonado", len(schedules))
        except Exception as e:
            logger.error("Error cargando schedules: %s", e)

    def add_job_to_scheduler(self, sched: dict, next_run: Optional[datetime] = None):
        job_id = str(sched["id"])

        if sched["frequency_minutes"]:
            trigger = IntervalTrigger(minutes=sched["frequency_minutes"])
        elif sched["specific_time"]:
            t = sched["specific_time"]
            trigger = CronTrigger(hour=t.hour, minute=t.minute)
        else:
            return

        if job_id in self._running_jobs:
            try:
                self.scheduler.remove_job(job_id)
            except Exception:
                pass

        self.scheduler.add_job(
            self.run_scheduled_scrape,
            trigger,
            id=job_id,
            args=[sched],
            replace_existing=True,
            next_run_time=next_run or datetime.now(),
        )
        self._running_jobs[job_id] = True

    async def run_scheduled_scrape(self, sched: dict):
        logger.info("Ejecutando scrape programado: %s - %s", sched["id"], sched["query"])

        search_query = sched["query"]
        location = sched["location"]

        if "Buenos Aires" in location:
            with get_conn() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        "SELECT neighborhood_index FROM scraper_schedules WHERE id = %s",
                        (sched["id"],),
                    )
                    row = cur.fetchone()
                    # Si no hay fila o el valor es None, empezamos en 0
                    neighborhood_index = 0
                    if row and row.get("neighborhood_index") is not None:
                        neighborhood_index = row["neighborhood_index"]

                    neighborhood = BA_NEIGHBORHOODS[neighborhood_index % len(BA_NEIGHBORHOODS)]
                    
                    cur.execute(
                        "UPDATE scraper_schedules SET neighborhood_index = neighborhood_index + 1, last_run_at = now() WHERE id = %s",
                        (sched["id"],),
                    )
                    conn.commit()

            location_with_neighborhood = f"{neighborhood}, Buenos Aires, Argentina"
            logger.info("Rotacion BA: usando barrio %s", neighborhood)
        else:
            location_with_neighborhood = location
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("UPDATE scraper_schedules SET last_run_at = now() WHERE id = %s", (sched["id"],))
                    conn.commit()

        try:
            provider = sched.get("provider") or "apify"
            schedule_id = str(sched["id"])
            if provider == "google":
                scraper = GoogleMapsScraper()
            else:
                scraper = ApifyScraper()

            job = await scraper.create_job(
                query=search_query,
                location=location_with_neighborhood,
                max_leads=sched["max_leads"],
                tenant_id=sched["tenant_id"],
            )

            job.status = "RUNNING"
            job.message = f"Schedule {schedule_id} ejecutado."
            save_job_state(job=job, provider=provider, source="schedule", schedule_id=schedule_id)

            asyncio.create_task(self._run_persisted_scrape(scraper, job, provider, schedule_id))
        except Exception as e:
            logger.error("Error en ejecucion programada %s: %s", sched["id"], e)

    async def _run_persisted_scrape(
        self,
        scraper: GoogleMapsScraper | ApifyScraper,
        job,
        provider: str,
        schedule_id: str,
    ):
        try:
            await scraper.run_and_ingest(job, {})
        except Exception as e:
            job.status = "FAILED"
            job.message = str(e)
            logger.error("Error en scrape persistido %s: %s", job.job_id, e)
        finally:
            save_job_state(job=job, provider=provider, source="schedule", schedule_id=schedule_id)


scraper_scheduler = ScraperScheduler()
