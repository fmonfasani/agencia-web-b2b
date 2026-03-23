"""
Optimizer — analiza un run y genera un plan de optimización accionable.
Con --llm: Claude genera fixes específicos con ejemplos de código.
Sin --llm: reglas determinísticas basadas en métricas.
"""
from dataclasses import dataclass, field
from finobs.scripts.trace_parser import Trace
from finobs.scripts.loop_detector import detect_loops
from finobs.scripts.metrics_aggregator import compute_latency_metrics
from finobs.scripts.cost_analyzer import compute_cost
from finobs.scripts.scoring import THRESHOLDS


@dataclass
class OptimizationPlan:
    run_id: str
    actions: list[dict] = field(default_factory=list)
    estimated_savings: dict = field(default_factory=dict)
    llm_suggestions: list[dict] = field(default_factory=list)


def build_optimization_plan(trace: Trace) -> OptimizationPlan:
    """Reglas determinísticas — no requiere LLM."""
    loops    = detect_loops(trace.steps)
    latency  = compute_latency_metrics(trace.steps)
    cost_data = compute_cost(trace.steps)
    errors   = [s for s in trace.steps if s.status == "error"]
    error_rate = len(errors) / max(len(trace.steps), 1)

    plan = OptimizationPlan(run_id=trace.run_id)

    # Loops → loop guard
    for loop in loops:
        saved_steps = loop["occurrences"] - 1
        plan.actions.append({
            "priority": "high",
            "category": "loop_fix",
            "issue": f"Tool '{loop['tool']}' called {loop['occurrences']}x with identical input",
            "fix": "Add result cache keyed by tool + input hash",
            "code_hint": (
                f"# Before calling {loop['tool']}, check cache:\n"
                f"cache_key = hash_input(tool='{loop['tool']}', input=query)\n"
                f"if cache_key in results_cache:\n"
                f"    return results_cache[cache_key]\n"
                f"result = {loop['tool']}(query)\n"
                f"results_cache[cache_key] = result"
            ),
            "estimated_step_savings": saved_steps,
        })

    # Token waste → context trimming
    if cost_data["waste_steps"]:
        total_waste_tokens = sum(w["input_tokens"] for w in cost_data["waste_steps"])
        saved_usd = (total_waste_tokens / 1_000_000) * 3.0  # sonnet input price
        plan.actions.append({
            "priority": "medium",
            "category": "token_optimization",
            "issue": f"{len(cost_data['waste_steps'])} steps with input/output ratio > {THRESHOLDS['waste_ratio']}x",
            "fix": "Trim context window — pass only relevant history, not full conversation",
            "code_hint": (
                "# Instead of passing full history:\n"
                "messages = full_history  # BAD\n\n"
                "# Pass only last N relevant steps:\n"
                "messages = trim_context(full_history, max_tokens=4096)  # GOOD"
            ),
            "estimated_usd_savings": round(saved_usd, 5),
        })

    # Latency spike → caching or parallelization
    if latency.get("p95", 0) > THRESHOLDS["latency_p95_ms"]:
        slow_tools = {s["tool"] for s in latency.get("slowest_steps", [])[:3]}
        plan.actions.append({
            "priority": "medium",
            "category": "latency_optimization",
            "issue": f"p95 latency {latency['p95']:.0f}ms exceeds threshold ({THRESHOLDS['latency_p95_ms']}ms)",
            "fix": f"Cache results for slow tools: {', '.join(slow_tools)}",
            "code_hint": (
                "# Add TTL cache to slow tools:\n"
                "from functools import lru_cache\n\n"
                "@lru_cache(maxsize=128)\n"
                "@traced('tool_name')\n"
                "def my_tool(query: str) -> str: ..."
            ),
            "estimated_ms_savings": round(latency["p95"] - THRESHOLDS["latency_p95_ms"], 0),
        })

    # Error rate → retry logic
    if error_rate > THRESHOLDS["error_rate_max"]:
        plan.actions.append({
            "priority": "high",
            "category": "reliability",
            "issue": f"Error rate {error_rate:.1%} on {len(errors)} steps",
            "fix": "Add exponential backoff retry on tool failures",
            "code_hint": (
                "import tenacity\n\n"
                "@tenacity.retry(\n"
                "    stop=tenacity.stop_after_attempt(3),\n"
                "    wait=tenacity.wait_exponential(min=1, max=10),\n"
                ")\n"
                "@traced('tool_name')\n"
                "def my_tool(query: str) -> str: ..."
            ),
        })

    # Calcular savings totales
    total_step_savings = sum(a.get("estimated_step_savings", 0) for a in plan.actions)
    total_usd_savings  = sum(a.get("estimated_usd_savings", 0) for a in plan.actions)
    plan.estimated_savings = {
        "steps_eliminated": total_step_savings,
        "usd_saved_per_run": round(total_usd_savings, 5),
    }

    return plan


async def enrich_with_llm(plan: OptimizationPlan, trace: Trace) -> OptimizationPlan:
    """Phase 5 enrichment: Claude sugiere mejoras arquitecturales adicionales."""
    import json
    import os
    import httpx

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise EnvironmentError("ANTHROPIC_API_KEY not set")

    context = f"""
Agent run: {trace.run_id}
Total steps: {len(trace.steps)}
Current optimization plan (deterministic):
{json.dumps([{"priority": a["priority"], "category": a["category"], "issue": a["issue"]} for a in plan.actions], indent=2)}

Step sequence: {' → '.join(s.tool for s in trace.steps)}
Error steps: {[s.tool for s in trace.steps if s.status == 'error']}
"""

    payload = {
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 1024,
        "system": (
            "You are an LLM agent optimizer. You receive a deterministic optimization plan "
            "and suggest ADDITIONAL architectural improvements the rules cannot detect.\n"
            "Focus on: prompt engineering, agent architecture, tool design.\n"
            "Respond ONLY with valid JSON array (no markdown fences):\n"
            '[{"priority":"high|medium|low","area":"prompt|architecture|tooling","suggestion":"string","example":"string"}]'
        ),
        "messages": [{"role": "user", "content": context}],
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json=payload,
        )
        response.raise_for_status()

    raw = response.json()["content"][0]["text"]
    try:
        plan.llm_suggestions = json.loads(raw)
    except json.JSONDecodeError:
        plan.llm_suggestions = []

    return plan


def save_plan(plan: OptimizationPlan) -> str:
    """Serializa el plan a OPTIMIZATION-PLAN-<run_id>.md"""
    from pathlib import Path

    actions_md = ""
    for i, action in enumerate(plan.actions, 1):
        priority_badge = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(action["priority"], "•")
        actions_md += f"\n### {i}. {priority_badge} [{action['category']}] {action['issue']}\n\n"
        actions_md += f"**Fix:** {action['fix']}\n\n"
        if action.get("code_hint"):
            actions_md += f"```python\n{action['code_hint']}\n```\n"
        if action.get("estimated_usd_savings"):
            actions_md += f"\n> Estimated savings: ~${action['estimated_usd_savings']:.5f} USD/run\n"
        if action.get("estimated_step_savings"):
            actions_md += f"\n> Eliminates ~{action['estimated_step_savings']} redundant steps\n"

    llm_md = ""
    if plan.llm_suggestions:
        llm_md = "\n## 🤖 Claude Architectural Suggestions\n\n"
        for s in plan.llm_suggestions:
            badge = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(s.get("priority", "low"), "•")
            llm_md += f"- {badge} **[{s.get('area', 'general')}]** {s.get('suggestion', '')}\n"
            if s.get("example"):
                llm_md += f"  > {s['example']}\n"

    content = f"""# ⚡ finobs — Optimization Plan

**Run ID:** `{plan.run_id}`
**Actions:** {len(plan.actions)} deterministic + {len(plan.llm_suggestions)} LLM suggestions

**Estimated savings if all applied:**
- Steps eliminated: {plan.estimated_savings.get('steps_eliminated', 0)}
- Cost saved per run: ~${plan.estimated_savings.get('usd_saved_per_run', 0):.5f} USD

---

## Deterministic Actions
{actions_md or "No issues requiring optimization detected."}
{llm_md}
---

*Generated by [finobs](https://github.com/tu-org/finobs)*
"""

    path = f"OPTIMIZATION-PLAN-{plan.run_id}.md"
    Path(path).write_text(content)
    return path
