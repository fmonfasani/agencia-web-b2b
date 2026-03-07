from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from core.config import settings
from core.rate_limit import limiter
from core.scheduler import scraper_scheduler
from core.observability import setup_observability
from routers import chat, agents, keys, scraper, intelligence, schedules
import logging

logger = logging.getLogger(__name__)

app = FastAPI(title="Agent Service", version="1.0.0")

# Initialize Observability (OpenTelemetry)
setup_observability(app)

@app.on_event("startup")
async def startup_event():
    scraper_scheduler.start()
    # Colectar métricas de la VPS cada 5 minutos
    from core.metrics_collector import vps_metrics_collector
    scraper_scheduler.scheduler.add_job(
        vps_metrics_collector.push_metrics,
        "interval",
        minutes=5,
        id="vps_metrics_collection",
        max_instances=1
    )
    logger.info("[Scheduler] VPS metrics collection job registered.")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

origins = settings.allowed_origins.split(",") if settings.allowed_origins != "*" else ["*"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET","POST","DELETE"], allow_headers=["*"])

# Include routers
app.include_router(chat.router)
app.include_router(agents.router)
app.include_router(keys.router)
app.include_router(scraper.router)
app.include_router(intelligence.router)
app.include_router(schedules.router)
app.mount("/widget", StaticFiles(directory="widget"), name="widget")


@app.get("/health")
async def health():
    is_scheduler_running = False
    try:
        is_scheduler_running = scraper_scheduler.scheduler.running
    except Exception:
        pass
        
    if not is_scheduler_running:
        return {"status": "unhealthy", "reason": "scheduler_not_running"}, 503
        
    return {
        "status": "ok", 
        "provider": settings.llm_provider,
        "scheduler": "running"
    }

