import httpx
from base import LLMProvider
from core.config import settings

class OllamaProvider(LLMProvider):
    @property
    def model(self) -> str:
        """Return the configured Ollama model."""
        return settings.ollama_model

    async def complete(self, system_prompt: str, messages: list) -> str:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{settings.ollama_base_url}/api/chat",
                json={"model": settings.ollama_model, "messages": [{"role": "system", "content": system_prompt}, *messages], "stream": False},
                timeout=120,
            )
            resp.raise_for_status()
            return resp.json()["message"]["content"]
