import asyncio
from typing import Any, Dict, List, Tuple
from enum import Enum
from ..tools.registry import get as registry_get
from ..embedding_utils import text_to_embedding
from ..llm.ollama_client import chat

MAX_ITERATIONS = 4

class AgentState(Enum):
    INIT = 0
    PLAN = 1
    EXECUTE = 2
    FINISH = 3
    ERROR = 4

class LangGraphEngine:
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.iterations = 0
        self.state = AgentState.INIT

    async def run(self, task: str) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        self.state = AgentState.PLAN
        results: List[Dict[str, Any]] = []
        start = asyncio.get_event_loop().time()
        try:
            while self.iterations < MAX_ITERATIONS:
                self.iterations += 1
                # Planner step: call a lightweight LLM (mock) to decide next action
                prompt = f"Task: {task} | Tenant: {self.tenant_id} | Iter: {self.iterations}"
                llm_resp = await chat([{"role": "system", "content": prompt}], model="qwen2:7b")
                action = {
                    "step": self.iterations,
                    "action": "mock_action",
                    "detail": str(llm_resp.get("response"))
                }
                results.append(action)

                # Execute a tool if registered
                tool = registry_get("scrape")
                if tool:
                    tool_res = await tool.run({"url": "https://example.com"}, self.tenant_id)
                    results.append({"tool": tool.name, "result": tool_res})

                await asyncio.sleep(0.01)
            self.state = AgentState.FINISH
        except Exception as e:
            self.state = AgentState.ERROR
            raise e
        metadata = {
            "tenant_id": self.tenant_id,
            "iterations": self.iterations,
            "time_ms": int((asyncio.get_event_loop().time() - start) * 1000)
        }
        return results, metadata
