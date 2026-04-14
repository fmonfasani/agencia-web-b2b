"""
OllamaProvider - LLM Provider implementation for Ollama.
"""
import os
from typing import List, Dict, Any

from base import LLMProvider
from .ollama_client import chat

class OllamaProvider(LLMProvider):
    """Provider for Ollama LLM."""

    def __init__(self, model: str = None):
        self._model = model or os.getenv("LLM_MODEL", "qwen2.5:0.5b")
        self.last_tokens_in: int = 0
        self.last_tokens_out: int = 0

    @property
    def model(self) -> str:
        return self._model

    async def complete(self, system_prompt: str, messages: List[Dict[str, str]]) -> str:
        formatted_messages = messages.copy()
        if formatted_messages and formatted_messages[0].get("role") != "system":
            formatted_messages.insert(0, {"role": "system", "content": system_prompt})

        response = await chat(formatted_messages, model=self._model)

        if "error" in response:
            raise Exception(f"Ollama error: {response.get('error', 'Unknown error')}")

        # Capture token usage (Ollama returns these in response root)
        self.last_tokens_in = response.get("prompt_eval_count", 0)
        self.last_tokens_out = response.get("eval_count", 0)

        if "message" in response and "content" in response["message"]:
            return response["message"]["content"]

        return str(response)
