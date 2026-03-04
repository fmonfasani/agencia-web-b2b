from core.config import settings
from llm.groq_provider import GroqProvider
from llm.ollama_provider import OllamaProvider

def get_llm():
    if settings.llm_provider == "groq":
        return GroqProvider()
    elif settings.llm_provider == "ollama":
        return OllamaProvider()
    raise ValueError(f"Unknown LLM provider: {settings.llm_provider}")

llm = get_llm()
