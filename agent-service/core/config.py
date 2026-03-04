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
    class Config:
        env_file = ".env"

settings = Settings()
