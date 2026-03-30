from typing import Any
from app.tools.registry import Tool

async def scrape(input_data: Any, tenant_id: str):
    url = input_data.get("url") if isinstance(input_data, dict) else None
    if not url:
        return {"text": "no url provided"}
    # Placeholder: real scraping would happen here
    return {"text": f"scraped content from {url} for tenant {tenant_id}"}

scrape_tool = Tool("scrape", {"url": str}, scrape)
