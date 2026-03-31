import os
import httpx
from typing import Dict, List, Tuple

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")

async def text_to_embedding(text: str) -> Tuple[List[float], Dict]:
    """
    Call Ollama to get embeddings for a given text.
    Returns (vector, meta) where meta["had_embedding_fallback"] signals a failed call.
    """
    if not text:
        return [0.0] * 768, {"had_embedding_fallback": False}
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
            return response.json().get("embedding", [0.0] * 768), {"had_embedding_fallback": False}
    except Exception as e:
        print(f"Embedding error (fallback activated): {e}")
        return [0.01] * 768, {"had_embedding_fallback": True}
