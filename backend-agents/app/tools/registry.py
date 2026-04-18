import asyncio
import logging
import os
from typing import Any, Callable, Awaitable, Dict

import httpx
from bs4 import BeautifulSoup

from app.qdrant.client import tenant_scoped_search
from app.embedding_utils import text_to_embedding

logger = logging.getLogger(__name__)

_SCRAPE_TIMEOUT = float(os.getenv("SCRAPE_TIMEOUT_SECONDS", "15"))
_SCRAPE_MAX_CHARS = int(os.getenv("SCRAPE_MAX_CHARS", "8000"))
_SEARCH_MAX_RESULTS = int(os.getenv("SEARCH_MAX_RESULTS", "5"))


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

async def scrape_tool(data: Dict[str, Any], tenant_id: str) -> Dict[str, Any]:
    url = data.get("url", "")
    if not url:
        return {"status": "error", "error": "no url provided", "url": "", "content": ""}

    try:
        headers = {"User-Agent": "Mozilla/5.0 (compatible; WebhooksBot/1.0)"}
        async with httpx.AsyncClient(
            timeout=_SCRAPE_TIMEOUT, follow_redirects=True
        ) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()

        lines = [l for l in soup.get_text(separator="\n", strip=True).splitlines() if l.strip()]
        content = "\n".join(lines)[:_SCRAPE_MAX_CHARS]
        title = soup.title.string.strip() if soup.title else ""

        logger.info("[scrape_tool] OK url=%s chars=%d tenant=%s", url, len(content), tenant_id)
        return {
            "status": "success",
            "url": url,
            "title": title,
            "content": content,
            "content_length": len(content),
        }

    except httpx.TimeoutException:
        logger.warning("[scrape_tool] timeout url=%s", url)
        return {"status": "error", "error": "timeout", "url": url, "content": ""}
    except Exception as e:
        logger.error("[scrape_tool] failed url=%s error=%s", url, str(e))
        return {"status": "error", "error": str(e), "url": url, "content": ""}


async def rag_search_tool(data: Dict[str, Any], tenant_id: str) -> Dict[str, Any]:
    query = data.get("task", "")
    vector, _ = await text_to_embedding(query)
    results = await tenant_scoped_search(tenant_id, vector)
    return {"results": results}


async def search_tool(data: Dict[str, Any], tenant_id: str) -> Dict[str, Any]:
    query = data.get("task", data.get("query", ""))
    if not query:
        return {"results": [], "results_count": 0, "query": ""}

    try:
        from duckduckgo_search import DDGS

        # DDGS is synchronous — run in thread to avoid blocking the event loop
        def _ddg_search():
            with DDGS() as ddgs:
                return list(ddgs.text(query, max_results=_SEARCH_MAX_RESULTS))

        raw = await asyncio.to_thread(_ddg_search)

        results = [
            {
                "title": r.get("title", ""),
                "url": r.get("href", ""),
                "snippet": r.get("body", ""),
            }
            for r in raw
        ]

        logger.info("[search_tool] OK query='%s' results=%d tenant=%s", query, len(results), tenant_id)
        return {"results": results, "results_count": len(results), "query": query}

    except Exception as e:
        logger.error("[search_tool] failed query='%s' error=%s", query, str(e))
        return {"results": [], "results_count": 0, "query": query, "error": str(e)}


# --- Register ---
register("scrape", Tool("scrape", scrape_tool))
register("rag_search", Tool("rag_search", rag_search_tool))
register("search", Tool("search", search_tool))
