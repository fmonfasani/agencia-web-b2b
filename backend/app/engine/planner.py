"""
Core agent planner: deterministic termination + LangGraph graph builder.
"""
import time
from typing import Any, Dict, List, Tuple

from langgraph.graph import StateGraph, END
from typing_extensions import TypedDict

from app.engine.state import AgentDecision
from app.engine.prompts import build_prompt
from app.models.agent_request_model import TraceStepType

MAX_ITERATIONS = 5


# ---------------------------------------------------------------------------
# LangGraph state schema (TypedDict for LangGraph compatibility)
# ---------------------------------------------------------------------------

class GraphState(TypedDict):
    task: str
    tenant_id: str
    messages: List[Dict[str, str]]
    iterations: int
    context: str
    next_step: str
    is_finished: bool
    rag_queries: List[Dict[str, Any]]
    rag_results: List[Dict[str, Any]]
    tools_executed: List[str]
    results_count: int
    rag_done: bool
    tracing_context: Any  # TracingContext — mutated in place


# ---------------------------------------------------------------------------
# Deterministic finish check — runs BEFORE LLM to save tokens
# ---------------------------------------------------------------------------

def should_finish(state: GraphState) -> bool:
    """Return True if agent should stop without calling LLM."""
    if state["iterations"] >= MAX_ITERATIONS:
        return True
    # Has results and already did at least one iteration
    if state["results_count"] > 0 and state["iterations"] >= 1:
        return True
    # Tool loop detection: same tool called twice
    executed = state["tools_executed"]
    if len(executed) >= 2 and executed[-1] == executed[-2]:
        return True
    return False


# ---------------------------------------------------------------------------
# Graph nodes
# ---------------------------------------------------------------------------

async def rag_node(state: GraphState, rag_retriever) -> Dict[str, Any]:
    """Retrieve context from vector store. Runs once before the agent loop."""
    ctx = state.get("tracing_context")
    try:
        query = state["task"]
        results, embedding_ms, qdrant_ms = await rag_retriever.search(
            query=query,
            tenant_id=state["tenant_id"],
            top_k=5,
            ctx=ctx,
        )
        context_text = "\n".join([r["text"] for r in results[:3]])

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
            "rag_done": True,
            "results_count": len(results),
        }
    except Exception as e:
        print(f"Error in rag_node: {e}")
        return {"context": "Error retrieving context from vector store.", "rag_done": True}


async def planner_node(state: GraphState, ollama_adapter, tool_registry) -> Dict[str, Any]:
    """Decide next action. Uses deterministic check before calling LLM."""
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

    # --- Deterministic finish: skip LLM if possible ---
    if should_finish(state):
        return {
            "is_finished": True,
            "next_step": "none",
            "iterations": state["iterations"] + 1,
        }

    # --- Build prompt and call LLM ---
    messages = build_prompt(
        task=state["task"],
        context=state["context"],
        history=state["messages"],
        tool_descriptions=tool_registry.get_tool_descriptions(),
    )

    try:
        t0 = time.time()
        response_dict = await ollama_adapter.chat_json(messages=messages, ctx=ctx)
        llm_ms = int((time.time() - t0) * 1000)

        decision = AgentDecision.from_dict(response_dict)

        # Force finish if LLM signals it OR we have results
        finished = decision.is_finished or state["results_count"] > 0

        new_msg = {"role": "assistant", "content": decision.thought}
        return {
            "messages": state["messages"] + [new_msg],
            "next_step": decision.action if not finished else "none",
            "is_finished": finished,
            "iterations": state["iterations"] + 1,
        }
    except Exception as e:
        print(f"Error in planner_node: {e}")
        return {"is_finished": True, "next_step": "none", "iterations": state["iterations"] + 1}


async def tool_executor_node(state: GraphState, tool_registry) -> Dict[str, Any]:
    """Execute the selected tool."""
    ctx = state.get("tracing_context")
    action = state["next_step"]

    if action == "none":
        return {}

    if ctx:
        try:
            ctx.add_step(
                step_id=f"tool_{action}_{state['iterations']}",
                step_type=TraceStepType.TOOL_EXECUTION,
                input_data={"tool": action, "task": state["task"]},
            )
        except Exception:
            pass

    try:
        result = await tool_registry.execute(action, {
            "task": state["task"],
            "tenant_id": state["tenant_id"],
        })
        new_msg = {"role": "tool", "content": str(result)}

        # Track tool executions for loop detection
        executed = state["tools_executed"] + [action]
        # Count results if tool returned any
        result_count_delta = 0
        if isinstance(result, dict) and result.get("results"):
            result_count_delta = len(result["results"])

        return {
            "messages": state["messages"] + [new_msg],
            "tools_executed": executed,
            "results_count": state["results_count"] + result_count_delta,
        }
    except Exception as e:
        return {
            "messages": state["messages"]
            + [{"role": "tool", "content": f"Error executing tool {action}: {e}"}],
            "tools_executed": state["tools_executed"] + [action],
        }


# ---------------------------------------------------------------------------
# Graph builder
# ---------------------------------------------------------------------------

def should_continue(state: GraphState):
    if state["is_finished"]:
        return END
    if state["next_step"] != "none":
        return "tools"
    return "planner"


def build_agent_graph(rag_retriever, ollama_adapter, tool_registry):
    """Build and compile the LangGraph agent graph with injected dependencies."""

    async def _rag(state):
        return await rag_node(state, rag_retriever)

    async def _planner(state):
        return await planner_node(state, ollama_adapter, tool_registry)

    async def _tools(state):
        return await tool_executor_node(state, tool_registry)

    workflow = StateGraph(GraphState)
    workflow.add_node("rag", _rag)
    workflow.add_node("planner", _planner)
    workflow.add_node("tools", _tools)

    workflow.set_entry_point("rag")
    workflow.add_edge("rag", "planner")
    workflow.add_conditional_edges(
        "planner",
        should_continue,
        {"tools": "tools", "planner": "planner", END: END},
    )
    workflow.add_edge("tools", "planner")

    return workflow.compile()


async def run_agent(
    task: str,
    tenant_id: str,
    rag_retriever,
    ollama_adapter,
    tool_registry,
    tracing_context=None,
) -> Tuple[List[Dict[str, str]], Dict[str, Any]]:
    """Run the agent and return (messages, metadata)."""
    graph = build_agent_graph(rag_retriever, ollama_adapter, tool_registry)

    initial_state: GraphState = {
        "task": task,
        "tenant_id": tenant_id,
        "messages": [],
        "iterations": 0,
        "context": "",
        "next_step": "none",
        "is_finished": False,
        "rag_queries": [],
        "rag_results": [],
        "tools_executed": [],
        "results_count": 0,
        "rag_done": False,
        "tracing_context": tracing_context,
    }

    result = await graph.ainvoke(initial_state)

    metadata = {
        "tenant_id": tenant_id,
        "iterations": result.get("iterations", 0),
        "rag_queries": result.get("rag_queries", []),
        "rag_results": result.get("rag_results", []),
        "tools_executed": result.get("tools_executed", []),
        "results_count": result.get("results_count", 0),
    }
    return result.get("messages", []), metadata
