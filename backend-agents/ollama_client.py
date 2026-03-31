import asyncio
import httpx
import json
from typing import Any, Dict, List

OLLAMA_BASE_URL = "http://localhost:11434"
DEFAULT_MODEL = "qwen2.5:0.5b"

async def chat(messages: List[Dict[str, str]], model: str = DEFAULT_MODEL) -> Dict[str, Any]:
    """Send a chat request to Ollama"""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": model,
                    "messages": messages,
                    "stream": False
                }
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        return {"message": {"content": f"Error calling Ollama: {str(e)}"}, "error": str(e)}

async def chat_json(prompt: str, model: str = DEFAULT_MODEL) -> Dict[str, Any]:
    """Send a request to Ollama and strictly parse JSON response."""
    try:
        messages = [
            {"role": "system", "content": "You are a specialized JSON assistant. Respond with valid JSON only."},
            {"role": "user", "content": prompt}
        ]
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": model,
                    "messages": messages,
                    "stream": False,
                    "format": "json" # Ollama native JSON mode
                }
            )
            response.raise_for_status()
            data = response.json()
            content = data.get("message", {}).get("content", "{}")
            return json.loads(content)
    except Exception as e:
        print(f"Ollama JSON Error: {e}")
        return {"thought": f"Error in LLM call: {e}", "action": "none", "is_finished": True}

async def generate(prompt: str, model: str = DEFAULT_MODEL) -> str:
    """Simple generate wrapper."""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={"model": model, "prompt": prompt, "stream": False}
            )
            response.raise_for_status()
            return str(response.json().get("response", ""))
    except Exception as e:
        return f"Error: {e}"
