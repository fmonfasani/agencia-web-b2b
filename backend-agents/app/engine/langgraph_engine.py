"""
LangGraphEngine — thin facade that keeps the same public interface
while delegating to the new planner architecture.
"""
from typing import Any, Dict, List, Tuple

from app.engine.adapters import RagRetriever, OllamaAdapter, RegistryAdapter
from app.engine.planner import run_agent


class LangGraphEngine:
    def __init__(self, tenant_id: str, tracing_context=None):
        self.tenant_id = tenant_id
        self.ctx = tracing_context
        self._rag = RagRetriever()
        self._llm = OllamaAdapter()
        self._tools = RegistryAdapter()

    async def run(self, task: str) -> Tuple[List[Dict[str, str]], Dict[str, Any]]:
        return await run_agent(
            task=task,
            tenant_id=self.tenant_id,
            rag_retriever=self._rag,
            ollama_adapter=self._llm,
            tool_registry=self._tools,
            tracing_context=self.ctx,
        )
