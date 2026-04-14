"""
Prompt templates and builders for the agent planner.
"""
from typing import Dict, List, Optional

PLANNER_SYSTEM_PROMPT_GENERIC = """\
You are a multitenant B2B lead generation agent.
Your job is to decide the NEXT SINGLE ACTION to take given the task and context.
Available tools:
{tool_descriptions}
HARD RULES (always apply, before thinking):
1. If context already contains relevant information → is_finished=true, action="none"
2. NEVER call the same tool twice.
3. scrape REQUIRES an explicit URL in the task. If no URL → action="none", is_finished=true
4. If no tool will clearly help → is_finished=true, action="none"
5. NEVER invent or assume URLs
Respond STRICTLY in JSON:
{{
    "thought": "brief reasoning (max 20 words)",
    "action": "tool_name or 'none'",
    "is_finished": true/false,
    "tool_input": {{}}
}}
"""

PLANNER_SYSTEM_PROMPT_TENANT = """\
You are a customer service assistant for {tenant_nombre}.
{descripcion}

Your job: answer customer questions using ONLY the context provided.
Tone: {tono}

HARD RULES:
1. If context contains the answer → is_finished=true, action="none", use context to answer
2. If context is empty or irrelevant → is_finished=true, action="none", use fallback message
3. NEVER invent information not present in context
4. NEVER recommend medications or give medical diagnoses
5. Fallback message: "{fallback}"

Respond STRICTLY in JSON:
{{
    "thought": "brief reasoning (max 20 words)",
    "action": "none",
    "is_finished": true,
    "answer": "your answer to the customer in Spanish"
}}
"""


def build_prompt(
    task: str,
    context: str,
    history: List[Dict[str, str]],
    tool_descriptions: str,
    persona: str = "default",
    tenant_config: Optional[Dict] = None,
) -> List[Dict[str, str]]:
    """Build the messages list for the planner LLM call."""

    if tenant_config:
        if tenant_config.get("base_prompt"):
            # Template-based agent: use base_prompt + optional custom_prompt
            system = tenant_config["base_prompt"]
            if tenant_config.get("custom_prompt"):
                system += "\n\n" + tenant_config["custom_prompt"]
            fallback = tenant_config.get("fallback", "Comunicate con nosotros para más información.")
            system += f"\n\nUSA ÚNICAMENTE la información del contexto para responder. Si no tenés información suficiente, respondé con: \"{fallback}\"\nResponde SIEMPRE en JSON: {{\"thought\": \"...\", \"action\": \"none\", \"is_finished\": true, \"answer\": \"...\"}}"
        else:
            system = PLANNER_SYSTEM_PROMPT_TENANT.format(
                tenant_nombre=tenant_config.get("nombre", "el negocio"),
                descripcion=tenant_config.get("descripcion", ""),
                tono=tenant_config.get("tono", "profesional y cercano"),
                fallback=tenant_config.get("fallback", "Comunicate con nosotros para más información."),
            )
    else:
        system = PLANNER_SYSTEM_PROMPT_GENERIC.format(
            tool_descriptions=tool_descriptions
        )

    history_text = ""
    if history:
        lines = [f"  {m['role']}: {m['content'][:100]}" for m in history[-3:]]
        history_text = "\n".join(lines)
    else:
        history_text = "  (none)"

    user_content = f"""\
Customer question: {task}
Context from knowledge base: {context or 'No specific context found.'}
History:
{history_text}
What is the answer?"""

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user_content},
    ]