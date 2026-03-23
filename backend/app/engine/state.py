"""
Agent state definitions for the new engine architecture.
"""
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

@dataclass
class AgentDecision:
    thought: str = ""
    action: str = "none"
    is_finished: bool = False
    tool_input: Dict[str, Any] = field(default_factory=dict)
    answer: str = ""

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "AgentDecision":
        return cls(
            thought=str(d.get("thought", "")),
            action=str(d.get("action", "none")),
            is_finished=bool(d.get("is_finished", False)),
            tool_input=d.get("tool_input", {}),
            answer=str(d.get("answer", "")),
        )


class AgentState(dict):
    """
    TypedDict-compatible dict with typed accessors for agent state.
    Inherits from dict so it works seamlessly with LangGraph.
    """

    @property
    def task(self) -> str:
        return self.get("task", "")

    @property
    def tenant_id(self) -> str:
        return self.get("tenant_id", "")

    @property
    def messages(self) -> List[Dict[str, str]]:
        return self.get("messages", [])

    @property
    def iterations(self) -> int:
        return self.get("iterations", 0)

    @property
    def context(self) -> str:
        return self.get("context", "")

    @property
    def next_step(self) -> str:
        return self.get("next_step", "none")

    @property
    def is_finished(self) -> bool:
        return self.get("is_finished", False)

    @property
    def rag_queries(self) -> List[Dict[str, Any]]:
        return self.get("rag_queries", [])

    @property
    def rag_results(self) -> List[Dict[str, Any]]:
        return self.get("rag_results", [])

    @property
    def tools_executed(self) -> List[str]:
        return self.get("tools_executed", [])

    @property
    def results_count(self) -> int:
        return self.get("results_count", 0)

    @property
    def rag_done(self) -> bool:
        return self.get("rag_done", False)

    @property
    def tracing_context(self) -> Optional[Any]:
        return self.get("tracing_context")
