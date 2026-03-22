import asyncio
from typing import Any, Dict

async def chat(messages: Any, model: str = "qwen2:7b") -> Dict[str, Any]:
    # Placeholder: in production, call Ollama API locally
    return {"response": "mocked_llm_response"}

async def chat_json(messages: Any, model: str = "qwen2:7b") -> Dict[str, Any]:
    # Returns a JSON-like response if possible
    return {"choices": [{"content": "mocked_json_response"}]}
