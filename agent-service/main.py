from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from core.config import settings
from core.rate_limit import limiter
from core.scheduler import scraper_scheduler
from routers import chat, agents, keys, scraper, intelligence, schedules

app = FastAPI(title="Agent Service", version="1.0.0")

@app.on_event("startup")
async def startup_event():
    scraper_scheduler.start()

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
    return {"status": "ok", "provider": settings.llm_provider}

