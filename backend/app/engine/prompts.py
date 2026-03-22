"""
Prompt templates and builders for the agent planner.
"""
from typing import Dict, List

AGENT_PERSONAS = {
    "default": "You are an expert B2B lead generation agent that helps find and qualify business leads.",
    "scraper": "You are a web scraping specialist that extracts structured data from business websites.",
    "analyst": "You are a business analyst that evaluates companies and qualifies them as potential leads.",
}

PLANNER_SYSTEM_PROMPT = """\
You are a multitenant B2B lead generation agent.

Your job is to decide the NEXT SINGLE ACTION to take given the task and context.

Available tools:
{tool_descriptions}

Rules:
- If context already contains enough information to answer, set is_finished=true and action="none"
- If you already executed a tool and got results, prefer finishing over looping
- NEVER repeat the same tool call twice
- If no tool is clearly helpful, finish immediately

Few-shot examples:

Task: buscar leads de software en Argentina
Context: I found 5 companies: MercadoLibre, Globant, OLX, Despegar, Mural.
History: [assistant searched]
-> {{"thought": "I have relevant results already", "action": "none", "is_finished": true}}

Task: listar herramientas disponibles
Context: No specific context found.
History: []
-> {{"thought": "This is a meta question I can answer directly", "action": "none", "is_finished": true}}

Task: scrape https://example.com
Context: No specific context found.
History: []
-> {{"thought": "I need to scrape the given URL", "action": "scrape", "is_finished": false, "tool_input": {{"url": "https://example.com"}}}}

Respond STRICTLY in JSON:
{{
    "thought": "brief reasoning (max 20 words)",
    "action": "tool_name or 'none'",
    "is_finished": true/false,
    "tool_input": {{}}
}}
"""


def build_prompt(
    task: str,
    context: str,
    history: List[Dict[str, str]],
    tool_descriptions: str,
    persona: str = "default",
) -> List[Dict[str, str]]:
    """Build the messages list for the planner LLM call."""
    system = PLANNER_SYSTEM_PROMPT.format(tool_descriptions=tool_descriptions)

    history_text = ""
    if history:
        lines = [f"  {m['role']}: {m['content'][:100]}" for m in history[-3:]]
        history_text = "\n".join(lines)
    else:
        history_text = "  (none)"

    user_content = f"""\
Task: {task}
Context: {context or 'No specific context found.'}
History:
{history_text}

What is the next action?"""

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user_content},
    ]
