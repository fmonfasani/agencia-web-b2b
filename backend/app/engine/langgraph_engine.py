import asyncio
import time
from typing import Any, Dict, List, TypedDict, Optional
from langgraph.graph import StateGraph, END
from app.tools.registry import get as registry_get
from app.qdrant.client import tenant_scoped_search, _normalize_tenant_id
from app.llm.ollama_client import chat_json
from app.embedding_utils import text_to_embedding
from app.models.agent_request_model import TraceStepType

MAX_ITERATIONS = 5


class AgentState(TypedDict):
    task: str
    tenant_id: str
    messages: List[Dict[str, str]]
    iterations: int
    context: str
    next_step: str
    is_finished: bool
    rag_queries: List[Dict[str, Any]]
    rag_results: List[Dict[str, Any]]
    tracing_context: Optional[Any]  # TracingContext — mutated in place, not returned


async def rag_node(state: AgentState):
    """Search for relevant context in Qdrant with tenant isolation."""
    ctx = state.get("tracing_context")
    try:
        query = state["task"]

        # --- Embedding with timing ---
        t0 = time.time()
        query_vector = await text_to_embedding(query)
        embedding_ms = int((time.time() - t0) * 1000)

        if ctx:
            try:
                ctx.add_embedding_trace(
                    model_name="nomic-embed-text",
                    input_text=query,
                    vector=query_vector,
                    duration_ms=embedding_ms,
                )
            except Exception:
                pass

        # --- Qdrant search with timing ---
        t0 = time.time()
        results = await tenant_scoped_search(state["tenant_id"], query_vector, limit=5)
        qdrant_ms = int((time.time() - t0) * 1000)

        if ctx:
            try:
                collection_name = _normalize_tenant_id(state["tenant_id"])
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
                    query_vector=query_vector,
                    top_k=5,
                    filter_dict={"tenant_id": state["tenant_id"]},
                    results=results_formatted,
                    duration_ms=qdrant_ms,
                )
            except Exception:
                pass

        # --- Build context text ---
        context_text = "\n".join([r["text"] for r in results[:3]])

        # --- RAG context trace ---
        if ctx:
            try:
                chunks = [r["text"] for r in results]
                chunk_ids = [r.get("id", str(i)) for i, r in enumerate(results)]
                ctx.set_rag_context_trace(
                    chunks=chunks,
                    chunk_ids=chunk_ids,
                    context_text=context_text or "No specific context found.",
                )
            except Exception:
                pass

        new_query = {"query_text": query, "tenant_id": state["tenant_id"]}
        return {
            "context": context_text or "No specific context found.",
            "rag_queries": state["rag_queries"] + [new_query],
            "rag_results": state["rag_results"] + results,
        }
    except Exception as e:
        print(f"Error in rag_node: {e}")
        return {"context": "Error retrieving context from vector store."}


async def planner_node(state: AgentState):
    """Decide the next action based on task and context."""
    ctx = state.get("tracing_context")

    # --- Trace iteration start ---
    if ctx:
        try:
            ctx.add_step(
                step_id=f"agent_iteration_{state['iterations'] + 1}",
                step_type=TraceStepType.AGENT_ITERATION,
                input_data={
                    "iteration": state["iterations"] + 1,
                    "max_iterations": MAX_ITERATIONS,
                },
            )
        except Exception:
            pass

    prompt = f"""
    Task: {state['task']}
    Tenant Context: {state['context']}
    History: {state['messages']}

    You are a multitenant expert agent.
    Available tools: scrape, rag_search.

    Respond STRICTLY in JSON:
    {{
        "thought": "brief reasoning",
        "action": "tool_name or 'none'",
        "is_finished": true/false
    }}
    """
    try:
        t0 = time.time()
        response = await chat_json(prompt)
        llm_ms = int((time.time() - t0) * 1000)

        thought = response.get("thought", "Thinking...")
        action = response.get("action", "none")
        finished = response.get("is_finished", False)

        # --- LLM trace ---
        if ctx:
            try:
                ctx.add_llm_trace(
                    model_name="qwen2.5:0.5b",
                    provider="ollama",
                    prompt=prompt,
                    response=str(response),
                    temperature=0.7,
                    duration_ms=llm_ms,
                )
            except Exception:
                pass

        new_msg = {"role": "assistant", "content": thought}
        return {
            "messages": state["messages"] + [new_msg],
            "next_step": action,
            "is_finished": finished or state["iterations"] >= MAX_ITERATIONS,
            "iterations": state["iterations"] + 1,
        }
    except Exception as e:
        print(f"Error in planner_node: {e}")
        return {"is_finished": True, "next_step": "none"}


async def tool_node(state: AgentState):
    """Execute the selected tool."""
    ctx = state.get("tracing_context")
    action = state["next_step"]
    if action == "none":
        return {}

    try:
        tool = registry_get(action)
        if not tool:
            return {
                "messages": state["messages"]
                + [{"role": "tool", "content": f"Error: Tool {action} not found."}]
            }

        if ctx:
            try:
                ctx.add_step(
                    step_id=f"tool_{action}",
                    step_type=TraceStepType.TOOL_EXECUTION,
                    input_data={"tool": action, "task": state["task"]},
                )
            except Exception:
                pass

        result = await tool.run({"task": state["task"]}, state["tenant_id"])
        new_msg = {"role": "tool", "content": str(result)}
        return {"messages": state["messages"] + [new_msg]}
    except Exception as e:
        return {
            "messages": state["messages"]
            + [{"role": "tool", "content": f"Error executing tool: {str(e)}"}]
        }


def should_continue(state: AgentState):
    if state["is_finished"]:
        return END
    if state["next_step"] != "none":
        return "tools"
    return "planner"


class LangGraphEngine:
    def __init__(self, tenant_id: str, tracing_context=None):
        self.tenant_id = tenant_id
        self.ctx = tracing_context

        workflow = StateGraph(AgentState)
        workflow.add_node("rag", rag_node)
        workflow.add_node("planner", planner_node)
        workflow.add_node("tools", tool_node)

        workflow.set_entry_point("rag")
        workflow.add_edge("rag", "planner")
        workflow.add_conditional_edges(
            "planner",
            should_continue,
            {"tools": "tools", "planner": "planner", END: END},
        )
        workflow.add_edge("tools", "planner")

        self.app = workflow.compile()

    async def run(self, task: str):
        initial_state = {
            "task": task,
            "tenant_id": self.tenant_id,
            "messages": [],
            "iterations": 0,
            "context": "",
            "next_step": "none",
            "is_finished": False,
            "rag_queries": [],
            "rag_results": [],
            "tracing_context": self.ctx,
        }

        result = await self.app.ainvoke(initial_state)

        metadata = {
            "tenant_id": self.tenant_id,
            "iterations": result.get("iterations", 0),
            "rag_queries": result.get("rag_queries", []),
            "rag_results": result.get("rag_results", []),
        }
        return result.get("messages", []), metadata
