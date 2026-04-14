"""
LangGraphEngine — thin facade that keeps the same public interface
while delegating to the new planner architecture.
"""
from typing import Any, Dict, List, Optional, Tuple

from app.engine.adapters import RagRetriever, RegistryAdapter
from app.engine.planner import run_agent


class LangGraphEngine:
    def __init__(
        self,
        tenant_id: str,
        llm_provider,
        tracing_context=None,
        knowledge_base_id: Optional[str] = None,
        agent_config_override: Optional[Dict[str, Any]] = None,
    ):
        self.tenant_id = tenant_id
        self.ctx = tracing_context
        self.knowledge_base_id = knowledge_base_id
        self.agent_config_override = agent_config_override
        self._rag = RagRetriever()
        self._llm_provider = llm_provider
        self._tools = RegistryAdapter()

    async def run(
        self,
        task: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> Tuple[List[Dict[str, str]], Dict[str, Any]]:
        return await run_agent(
            task=task,
            tenant_id=self.tenant_id,
            rag_retriever=self._rag,
            llm_provider=self._llm_provider,
            tool_registry=self._tools,
            tracing_context=self.ctx,
            conversation_history=conversation_history or [],
            knowledge_base_id=self.knowledge_base_id,
            agent_config_override=self.agent_config_override,
        )
