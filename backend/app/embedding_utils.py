import os
import httpx
from typing import List

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")

async def text_to_embedding(text: str) -> List[float]:
    """Call Ollama to get embeddings for a given text."""
    if not text:
        return [0.0] * 768
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/embeddings",
                json={
                    "model": EMBED_MODEL,
                    "prompt": text,
                }
            )
            response.raise_for_status()
            return response.json().get("embedding", [0.0] * 768)
    except Exception as e:
        # Fallback for demo if Ollama is not ready
        print(f"Embedding error: {e}")
        return [0.01] * 768
