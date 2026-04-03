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
        """
        Initialize OllamaProvider.

        Args:
            model: Model name to use. If not provided, uses LLM_MODEL env var or default.
        """
        self._model = model or os.getenv("LLM_MODEL", "qwen2.5:0.5b")

    @property
    def model(self) -> str:
        """Return the model name being used."""
        return self._model

    async def complete(self, system_prompt: str, messages: List[Dict[str, str]]) -> str:
        """
        Generate a completion using Ollama.

        Args:
            system_prompt: System prompt for the LLM
            messages: List of message dicts with 'role' and 'content'

        Returns:
            Completion text from the LLM
        """
        # Prepend system prompt as a system message if not already present
        formatted_messages = messages.copy()
        if formatted_messages and formatted_messages[0].get("role") != "system":
            formatted_messages.insert(0, {"role": "system", "content": system_prompt})

        response = await chat(formatted_messages, model=self._model)

        # Extract message content from response
        if "error" in response:
            raise Exception(f"Ollama error: {response.get('error', 'Unknown error')}")

        if "message" in response and "content" in response["message"]:
            return response["message"]["content"]

        return str(response)
