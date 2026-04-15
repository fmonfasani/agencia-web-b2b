from fastapi import FastAPI

from app.api import admin, auth, tenant
from app.middleware.auth import auth_middleware

app = FastAPI(title="Production-Grade SaaS Base")
app.middleware("http")(auth_middleware)

app.include_router(auth.router, prefix="/api/auth")
app.include_router(admin.router, prefix="/api")
app.include_router(tenant.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
