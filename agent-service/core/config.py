from pydantic_settings import BaseSettings
from typing import Literal

class Settings(BaseSettings):
    llm_provider: Literal["groq", "ollama"] = "groq"
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:3b"
    database_url: str
    admin_secret: str
    allowed_origins: str = "*"

    # --- Scraper (Apify) ---
    apify_api_token: str = ""
    # --- Scraper (Google Maps Direct) ---
    google_maps_api_key: str = ""
    # URL base de la app Next.js para hacer el ingest de leads
    # En producción: https://tu-dominio.com | En local: http://localhost:3000
    nextjs_internal_url: str = "http://localhost:3000"
    # Secret compartido entre agent-service y Next.js para llamadas internas
    internal_api_secret: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
