"""
Core agent planner: deterministic termination + LangGraph graph builder.
"""
import os

import time
import psycopg2
from typing import Any, Dict, List, Optional, Tuple

from langgraph.graph import StateGraph, END
from typing_extensions import TypedDict

from app.engine.state import AgentDecision
from app.engine.prompts import build_prompt
from app.models import TraceStepType


def _load_tenant_config(tenant_id: str) -> dict:
    """Carga configuración del tenant desde PostgreSQL."""
    try:
        #conn = psycopg2.connect("postgresql://postgres:Karaoke27570Echeverria@localhost:5432/agencia_web_b2b")
        
        DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:Karaoke27570Echeverria@localhost:5432/agencia_web_b2b")
        conn = psycopg2.connect(DATABASE_URL)
        
        cur = conn.cursor()
        cur.execute("SELECT nombre, descripcion, config FROM tenants WHERE id = %s", (tenant_id,))
        row = cur.fetchone()
        conn.close()
        if row:
            config = row[2] or {}
            return {
                "nombre": row[0],
                "descripcion": row[1] or "",
                "tono": config.get("tono", "profesional y cercano"),
                "fallback": config.get("mensaje_fallback", "Comunicate con nosotros para mas informacion."),
            }
    except Exception as e:
        print(f"[tenant_config] Error: {e}")
    return {}


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
    actionable_results_count: int
    rag_hits_count: int
    rag_done: bool
    tracing_context: Any
    llm_calls: int
    embedding_ms: int
    rag_ms: int
    llm_ms: int
    had_embedding_fallback: bool
    had_llm_error: bool
    llm_error_msg: str


# ---------------------------------------------------------------------------
# Deterministic finish check — runs BEFORE LLM to save tokens
# ---------------------------------------------------------------------------

def _task_has_url(task: str) -> bool:
    t = task.lower()
    return "http://" in t or "https://" in t


def should_finish(state: GraphState) -> bool:
    """Return True if agent should stop without calling LLM."""
    if state["iterations"] >= MAX_ITERATIONS:
        return True
    if state["actionable_results_count"] > 0 and state["iterations"] >= 1:
        return True
    executed = state["tools_executed"]
    if len(executed) >= 2 and executed[-1] == executed[-2]:
        return True
    if "scrape" in executed and not _task_has_url(state.get("task", "")):
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
        results, embedding_ms, qdrant_ms, had_fallback = await rag_retriever.search(
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
        update: Dict[str, Any] = {
            "context": context_text or "No specific context found.",
            "rag_queries": state["rag_queries"] + [new_query],
            "rag_results": state["rag_results"] + results,
            "rag_done": True,
            "rag_hits_count": len(results),
            "actionable_results_count": 0,
            "results_count": 0,
            "embedding_ms": state["embedding_ms"] + embedding_ms,
            "rag_ms": state["rag_ms"] + qdrant_ms,
        }
        if had_fallback:
            update["had_embedding_fallback"] = True
        return update
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
    tenant_cfg = _load_tenant_config(state["tenant_id"])
    messages = build_prompt(
        task=state["task"],
        context=state["context"],
        history=state["messages"],
        tool_descriptions=tool_registry.get_tool_descriptions(),
        tenant_config=tenant_cfg if tenant_cfg else None,
    )

    try:
        t0 = time.time()
        response_dict = await ollama_adapter.chat_json(messages=messages, ctx=ctx)
        call_ms = int((time.time() - t0) * 1000)

        llm_error_update: Dict[str, Any] = {}
        if "_llm_error" in response_dict:
            llm_error_update = {
                "had_llm_error": True,
                "llm_error_msg": response_dict["_llm_error"],
            }

        decision = AgentDecision.from_dict(response_dict)

        # Para tenants con config (agentes de consulta), no forzar search
        # Solo forzar search si es agente de lead generation (sin tenant_config)
        tenant_cfg_check = _load_tenant_config(state["tenant_id"])
        if not tenant_cfg_check and not _task_has_url(state["task"]) and state["iterations"] == 0 and not llm_error_update:
            decision.action = "search"
            decision.is_finished = False

        # Bloquear scrape cuando la task no tiene URL
        if decision.action == "scrape" and not _task_has_url(state["task"]):
            decision.action = "none"
            decision.is_finished = True

        finished = (
            decision.is_finished
            or state["actionable_results_count"] > 0
            or ("scrape" in state["tools_executed"] and not _task_has_url(state["task"]))
        )

        content = decision.answer if decision.answer else decision.thought
        new_msg = {"role": "assistant", "content": content}
        
        return {
            "messages": state["messages"] + [new_msg],
            "next_step": decision.action if not finished else "none",
            "is_finished": finished,
            "iterations": state["iterations"] + 1,
            "llm_calls": state["llm_calls"] + 1,
            "llm_ms": state["llm_ms"] + call_ms,
            **llm_error_update,
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
        executed = state["tools_executed"] + [action]
        result_count_delta = 0
        if isinstance(result, dict) and result.get("results"):
            result_count_delta = len(result["results"])
        new_actionable = state["actionable_results_count"] + result_count_delta
        return {
            "messages": state["messages"] + [new_msg],
            "tools_executed": executed,
            "actionable_results_count": new_actionable,
            "results_count": new_actionable,
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


def _finish_reason_from_state(state: dict) -> str:
    tools = state.get("tools_executed", [])
    if len(tools) >= 2 and tools[-1] == tools[-2]:
        return "loop_detected"
    if state.get("iterations", 0) >= MAX_ITERATIONS:
        return "max_iterations"
    if state.get("actionable_results_count", 0) > 0:
        return "results_found"
    if state.get("rag_hits_count", 0) > 0:
        return "rag_only"
    if state.get("had_llm_error"):
        return "llm_error"
    if state.get("had_embedding_fallback"):
        return "embedding_error"
    return "no_results"


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
        "actionable_results_count": 0,
        "rag_hits_count": 0,
        "rag_done": False,
        "tracing_context": tracing_context,
        "llm_calls": 0,
        "embedding_ms": 0,
        "rag_ms": 0,
        "llm_ms": 0,
        "had_embedding_fallback": False,
        "had_llm_error": False,
        "llm_error_msg": "",
    }

    agent_error: Optional[str] = None
    try:
        result = await graph.ainvoke(initial_state)
    except Exception as exc:
        agent_error = str(exc)
        result = initial_state

    metadata = {
        "tenant_id": tenant_id,
        "iterations": result.get("iterations", 0),
        "llm_calls": result.get("llm_calls", 0),
        "tools_executed": result.get("tools_executed", []),
        "results_count": result.get("results_count", 0),
        "actionable_results_count": result.get("actionable_results_count", 0),
        "rag_hits_count": result.get("rag_hits_count", 0),
        "rag_queries": result.get("rag_queries", []),
        "rag_results": result.get("rag_results", []),
        "finish_reason": "llm_error" if agent_error else _finish_reason_from_state(result),
        "model": ollama_adapter.model,
        "tokens_used": 0,
        "embedding_ms": result.get("embedding_ms", 0),
        "rag_ms": result.get("rag_ms", 0),
        "llm_ms": result.get("llm_ms", 0),
        "had_embedding_fallback": result.get("had_embedding_fallback", False),
        "had_llm_error": result.get("had_llm_error", False),
        "error": agent_error,
    }
    if agent_error:
        raise RuntimeError(agent_error)
    return result.get("messages", []), metadata