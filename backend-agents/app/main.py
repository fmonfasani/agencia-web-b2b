from fastapi import FastAPI
from app.routers import rag

app = FastAPI(title="Agents API")

app.include_router(rag.router, prefix="/rag")

@app.get("/health")
def health():
    return {"status": "ok"}
