from typing import Any, Dict, Callable, Awaitable
from app.qdrant.client import tenant_scoped_search
from app.embedding_utils import text_to_embedding

class Tool:
    def __init__(self, name: str, func: Callable[[Dict[str, Any], str], Awaitable[Any]]):
        self.name = name
        self.func = func

    async def run(self, input_data: Dict[str, Any], tenant_id: str) -> Any:
        return await self.func(input_data, tenant_id)

REGISTRY: Dict[str, Tool] = {}

def register(name: str, tool: Tool):
    REGISTRY[name] = tool

def get(name: str) -> Tool:
    return REGISTRY.get(name)

# --- Tool Implementations ---

async def scrape_tool(data: Dict[str, Any], tenant_id: str):
    url = data.get("url", "https://example.com")
    # Mocking real scrape for now, but returning structured data
    return {"status": "success", "url": url, "content": f"Scraped content from {url} for tenant {tenant_id}"}

async def rag_search_tool(data: Dict[str, Any], tenant_id: str):
    query = data.get("task", "")
    vector, _ = await text_to_embedding(query)
    results = await tenant_scoped_search(tenant_id, vector)
    return {"results": results}


async def search_tool(data: Dict[str, Any], tenant_id: str) -> Dict[str, Any]:
    """
    B2B company/lead search tool.
    STUB — real external search integration is out of scope for this fix.
    Returns structured results compatible with results_count tracking
    (response must include key "results" as a list).
    """
    query = data.get("task", data.get("query", ""))
    # Placeholder results until a real search API is wired
    results = [
        {"name": f"Company {i}", "url": "", "description": f"Result for: {query}"}
        for i in range(1, 4)
    ]
    return {"results": results, "results_count": len(results), "query": query}


# --- Registering Tools ---
register("scrape", Tool("scrape", scrape_tool))
register("rag_search", Tool("rag_search", rag_search_tool))
register("search", Tool("search", search_tool))
