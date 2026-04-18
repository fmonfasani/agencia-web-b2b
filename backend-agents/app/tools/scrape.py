from app.tools.registry import scrape_tool, Tool

# scrape_tool is defined and registered in registry.py
# This module re-exports it for any code that imports directly from here.
scrape = scrape_tool
scrape_tool_instance = Tool("scrape", scrape_tool)
