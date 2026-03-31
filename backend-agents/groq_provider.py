import httpx
from llm.base import LLMProvider
from core.config import settings

class GroqProvider(LLMProvider):
    async def complete(self, system_prompt: str, messages: list) -> str:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.groq_api_key}"},
                json={
                    "model": settings.groq_model,
                    "messages": [{"role": "system", "content": system_prompt}, *messages],
                    "max_tokens": 1024,
                    "temperature": 0.7,
                },
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
