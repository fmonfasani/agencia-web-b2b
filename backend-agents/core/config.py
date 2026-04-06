"""
Configuración centralizada del backend-agents using Pydantic Settings.
All configuration is loaded from environment variables.
"""
import os
from typing import Literal, Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    # --- LLM Provider Selection ---
    llm_provider: Literal["groq", "ollama", "openrouter"] = "ollama"

    # --- Ollama (local) ---
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:3b"

    # --- Groq (cloud) ---
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"

    # --- OpenRouter (aggregator) ---
    openrouter_api_keys: str = ""  # CSV: key1,key2,key3
    openrouter_default_model: str = "openai/gpt-3.5-turbo"
    openrouter_strategy: str = "least_used"  # "least_used" | "round_robin"
    openrouter_usage_file: str = "openrouter_usage.json"
    openrouter_max_daily_per_key: int = 45
    openrouter_timezone: str = "UTC"
    openrouter_app_name: str = "Backend-Agents"
    openrouter_app_url: str = "https://tusitio.com"

    # --- Database ---
    database_url: str = "postgresql://postgres:Karaoke27570Echeverria@localhost:5432/agencia_web_b2b"

    # --- API ---
    allowed_origins: str = "http://localhost:3001,http://127.0.0.1:3001"
    rate_limit_per_minute: int = 10

    # --- Logging & Observability ---
    log_level: str = "INFO"
    otel_enabled: bool = False

    # --- Multi-tenant ---
    default_model: str = "ollama"
    allow_fallback_tenant: bool = False
    default_tenant_id: str = "default"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # Ignore extra fields from .env


# Global settings instance
settings = Settings()
