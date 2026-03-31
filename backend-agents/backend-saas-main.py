"""
backend-saas/app/main.py
FastAPI application for SaaS management.
Handles: Auth, Onboarding, Tenant management.
"""
import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Webshooks SaaS API",
    description="Multi-tenant SaaS platform for AI-powered knowledge bases",
    version="1.0.0"
)

# Configure CORS
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3001,http://127.0.0.1:3001"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


def _rate_limit_exceeded_handler(request, exc):
    return HTTPException(
        status_code=429,
        detail="Rate limit exceeded. Max 100 requests per minute."
    )


# Import routers AFTER app initialization
try:
    from app.auth_router import router as auth_router
    from app.onboarding_router import router as onboarding_router
    logger.info("Routers loaded successfully")
except ImportError as e:
    logger.error(f"Failed to import routers: {e}")
    raise

# Include routers
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(onboarding_router, prefix="/onboarding", tags=["Onboarding"])


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Check API health status."""
    return {
        "status": "ok",
        "service": "backend-saas",
        "version": "1.0.0"
    }


# Root endpoint
@app.get("/", tags=["Info"])
async def root():
    """API root endpoint with information."""
    return {
        "name": "Webshooks SaaS API",
        "description": "Multi-tenant SaaS platform",
        "docs": "/docs",
        "openapi": "/openapi.json"
    }


# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions."""
    return {
        "error": exc.detail,
        "status_code": exc.status_code
    }


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions."""
    logger.error(f"Unexpected error: {exc}")
    return {
        "error": "Internal server error",
        "status_code": 500
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )
