"""
Adapter/bridge classes that connect the new engine architecture
to existing infrastructure (Qdrant, Ollama, Tool Registry).
"""
import time
import json
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.embedding_utils import text_to_embedding
from app.qdrant.client import tenant_scoped_search, _normalize_tenant_id
from app.tools.registry import REGISTRY

OLLAMA_BASE_URL = "http://localhost:11434"
DEFAULT_MODEL = "qwen2.5:0.5b"


class RagRetriever:
    """Embeds query text and searches Qdrant with tenant isolation."""

    async def search(
        self,
        query: str,
        tenant_id: str,
        top_k: int = 5,
        ctx=None,
    ) -> Tuple[List[Dict[str, Any]], int, int]:
        """
        Returns (results, embedding_ms, qdrant_ms).
        Results are dicts with keys: id, score, text, source.
        """
        # --- Embed ---
        t0 = time.time()
        vector = await text_to_embedding(query)
        embedding_ms = int((time.time() - t0) * 1000)

        if ctx:
            try:
                ctx.add_embedding_trace(
                    model_name="nomic-embed-text",
                    input_text=query,
                    vector=vector,
                    duration_ms=embedding_ms,
                )
            except Exception:
                pass

        # --- Search ---
        t0 = time.time()
        results = await tenant_scoped_search(tenant_id, vector, limit=top_k)
        qdrant_ms = int((time.time() - t0) * 1000)

        if ctx:
            try:
                collection_name = _normalize_tenant_id(tenant_id)
                results_formatted = [
                    {
                        "id": r.get("id", ""),
                        "score": r.get("score", 0.0),
                        "payload": {"text": r.get("text", ""), "source": r.get("source")},
                    }
                    for r in results
                ]
                ctx.add_qdrant_trace(
                    collection_name=collection_name,
                    query_vector=vector,
                    top_k=top_k,
                    filter_dict={"tenant_id": tenant_id},
                    results=results_formatted,
                    duration_ms=qdrant_ms,
                )
            except Exception:
                pass

        return results, embedding_ms, qdrant_ms


class OllamaAdapter:
    """Calls Ollama with a messages list and returns parsed JSON."""

    def __init__(self, model: str = DEFAULT_MODEL):
        self.model = model

    async def chat_json(
        self,
        messages: List[Dict[str, str]],
        ctx=None,
    ) -> Dict[str, Any]:
        """
        Sends messages to Ollama with format=json.
        Traces the LLM call if ctx is provided.
        Returns parsed dict (never raises).
        """
        t0 = time.time()
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{OLLAMA_BASE_URL}/api/chat",
                    json={
                        "model": self.model,
                        "messages": messages,
                        "stream": False,
                        "format": "json",
                    },
                )
                response.raise_for_status()
                data = response.json()
                content = data.get("message", {}).get("content", "{}")
                result = json.loads(content)
        except Exception as e:
            print(f"OllamaAdapter.chat_json error: {e}")
            result = {"thought": f"LLM error: {e}", "action": "none", "is_finished": True}

        llm_ms = int((time.time() - t0) * 1000)

        if ctx:
            try:
                prompt_text = "\n".join(
                    f"{m['role']}: {m['content']}" for m in messages
                )
                ctx.add_llm_trace(
                    model_name=self.model,
                    provider="ollama",
                    prompt=prompt_text,
                    response=str(result),
                    temperature=0.7,
                    duration_ms=llm_ms,
                )
            except Exception:
                pass

        return result


class RegistryAdapter:
    """
    Wraps the existing REGISTRY dict to provide:
    - get_tool_descriptions() → str for the prompt
    - execute(action, tool_input) → result
    Excludes "rag_search" (RAG is done upfront by rag_node).
    """

    # Tools the agent planner can call (rag_search removed — RAG is upfront)
    _AVAILABLE = ["scrape"]

    def get_tool_descriptions(self) -> str:
        lines = []
        descriptions = {
            "scrape": "scrape(url) — fetch and extract content from a web URL",
        }
        for name in self._AVAILABLE:
            if name in REGISTRY:
                lines.append(f"- {descriptions.get(name, name)}")
        if not lines:
            return "- (no tools available)"
        return "\n".join(lines)

    async def execute(self, action: str, tool_input: Dict[str, Any]) -> Any:
        """Execute a tool from the registry. Returns result or error string."""
        if action == "none" or action == "finish":
            return {}
        if action not in self._AVAILABLE:
            return {"error": f"Tool '{action}' not available"}

        tool = REGISTRY.get(action)
        if not tool:
            return {"error": f"Tool '{action}' not found in registry"}

        tenant_id = tool_input.pop("tenant_id", "")
        return await tool.run(tool_input, tenant_id)
