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
    vector = await text_to_embedding(query)
    results = await tenant_scoped_search(tenant_id, vector)
    return {"results": results}

# --- Registering Tools ---
register("scrape", Tool("scrape", scrape_tool))
register("rag_search", Tool("rag_search", rag_search_tool))
