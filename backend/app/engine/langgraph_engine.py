import asyncio
from typing import Annotated, Any, Dict, List, TypedDict, Union
from langgraph.graph import StateGraph, END
from app.tools.registry import get as registry_get
from app.qdrant.client import tenant_scoped_search
from app.llm.ollama_client import chat_json
from app.embedding_utils import text_to_embedding

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

async def rag_node(state: AgentState):
    """Search for relevant context in Qdrant with tenant isolation."""
    try:
        query = state["task"]
        # Convert text query to vector
        query_vector = await text_to_embedding(query)
        results = await tenant_scoped_search(state["tenant_id"], query_vector, limit=5)
        
        # Capture for persistence
        new_query = {"query_text": query, "tenant_id": state["tenant_id"]}
        new_results = results # Results already have text, score, source
        
        context_text = "\n".join([r["text"] for r in results[:3]])
        
        return {
            "context": context_text or "No specific context found.",
            "rag_queries": state["rag_queries"] + [new_query],
            "rag_results": state["rag_results"] + new_results
        }
    except Exception as e:
        print(f"Error in rag_node: {e}")
        return {"context": "Error retrieving context from vector store."}

async def planner_node(state: AgentState):
    """Decide the next action based on task and context."""
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
        response = await chat_json(prompt)
        thought = response.get("thought", "Thinking...")
        action = response.get("action", "none")
        finished = response.get("is_finished", False)
        
        new_msg = {"role": "assistant", "content": thought}
        return {
            "messages": state["messages"] + [new_msg],
            "next_step": action,
            "is_finished": finished or state["iterations"] >= MAX_ITERATIONS,
            "iterations": state["iterations"] + 1
        }
    except Exception as e:
        print(f"Error in planner_node: {e}")
        return {"is_finished": True, "next_step": "none"}

async def tool_node(state: AgentState):
    """Execute the selected tool."""
    action = state["next_step"]
    if action == "none":
        return {}
    
    try:
        tool = registry_get(action)
        if not tool:
            return {"messages": state["messages"] + [{"role": "tool", "content": f"Error: Tool {action} not found."}]}
        
        # Tool execution with tenant context
        result = await tool.run({"task": state["task"]}, state["tenant_id"])
        new_msg = {"role": "tool", "content": str(result)}
        return {"messages": state["messages"] + [new_msg]}
    except Exception as e:
        return {"messages": state["messages"] + [{"role": "tool", "content": f"Error executing tool: {str(e)}"}]}

def should_continue(state: AgentState):
    if state["is_finished"]:
        return END
    if state["next_step"] != "none":
        return "tools"
    return "planner"

class LangGraphEngine:
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        
        workflow = StateGraph(AgentState)
        workflow.add_node("rag", rag_node)
        workflow.add_node("planner", planner_node)
        workflow.add_node("tools", tool_node)
        
        workflow.set_entry_point("rag")
        workflow.add_edge("rag", "planner")
        workflow.add_conditional_edges("planner", should_continue, {
            "tools": "tools",
            "planner": "planner",
            END: END
        })
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
            "rag_results": []
        }
        
        result = await self.app.ainvoke(initial_state)
        
        metadata = {
            "tenant_id": self.tenant_id,
            "iterations": result.get("iterations", 0),
            "rag_queries": result.get("rag_queries", []),
            "rag_results": result.get("rag_results", [])
        }
        return result.get("messages", []), metadata
