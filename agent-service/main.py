from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from core.config import settings
from core.rate_limit import limiter
from routers import chat, agents, keys

app = FastAPI(title="Agent Service", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

origins = settings.allowed_origins.split(",") if settings.allowed_origins != "*" else ["*"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET","POST","DELETE"], allow_headers=["*"])

app.include_router(chat.router)
app.include_router(agents.router)
app.include_router(keys.router)
app.mount("/widget", StaticFiles(directory="widget"), name="widget")

@app.get("/health")
async def health():
    return {"status": "ok", "provider": settings.llm_provider}
