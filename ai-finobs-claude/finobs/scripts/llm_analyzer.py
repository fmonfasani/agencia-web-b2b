"""
Phase 4 — Claude-powered semantic analysis.
Scripts run first. Claude only analyzes what scripts cannot:
- Root cause reasoning
- Prompt ambiguity detection
- Cross-step pattern recognition
- Actionable fix suggestions
"""
import json
import os
import httpx
from dataclasses import dataclass, field
from finobs.scripts.trace_parser import Trace
from finobs.scripts.loop_detector import detect_loops
from finobs.scripts.metrics_aggregator import compute_latency_metrics
from finobs.scripts.cost_analyzer import compute_cost

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
MODEL = "claude-haiku-4-5-20251001"  # Haiku: más barato para análisis interno


@dataclass
class LLMInsight:
    root_cause: str
    patterns: list[str] = field(default_factory=list)
    fixes: list[dict] = field(default_factory=list)
    confidence: float = 0.0
    tokens_used: int = 0


def _get_api_key() -> str:
    key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not key:
        raise EnvironmentError(
            "ANTHROPIC_API_KEY not set.\n"
            "Export it: export ANTHROPIC_API_KEY=sk-ant-..."
        )
    return key


def _build_context(trace: Trace, script_results: dict) -> str:
    """
    Compress trace into a token-efficient context for Claude.
    Scripts already computed the numbers — Claude gets the summary.
    """
    failed_steps = [s for s in trace.steps if s.status == "error"]
    loops = script_results.get("loops", [])
    latency = script_results.get("latency", {})
    cost = script_results.get("cost", {})

    # Step summary — no enviamos trace completa, solo lo anómalo
    anomalous = []
    for i, step in enumerate(trace.steps):
        if step.status == "error":
            anomalous.append(f"  step_{i:03d} [{step.tool}] ERROR | {step.input_tokens}→{step.output_tokens} tokens | {step.duration_ms:.0f}ms")
        elif step.duration_ms > latency.get("p95", 9999) * 1.5:
            anomalous.append(f"  step_{i:03d} [{step.tool}] SLOW  | {step.duration_ms:.0f}ms")

    loop_summary = ""
    for loop in loops:
        loop_summary += f"  - {loop['tool']} repeated {loop['occurrences']}x at steps {loop['step_indices']}\n"

    return f"""
AGENT RUN SUMMARY
run_id: {trace.run_id}
total_steps: {len(trace.steps)}
failed_steps: {len(failed_steps)}

SCRIPT METRICS (computed deterministically):
- p50/p95/p99: {latency.get('p50', 0):.0f}ms / {latency.get('p95', 0):.0f}ms / {latency.get('p99', 0):.0f}ms
- total_cost: ${cost.get('total_usd', 0):.5f}
- waste_steps: {len(cost.get('waste_steps', []))}
- loops_detected: {len(loops)}

LOOPS:
{loop_summary or '  none'}

ANOMALOUS STEPS:
{chr(10).join(anomalous) or '  none'}

STEP SEQUENCE (tool names only):
{' → '.join(s.tool for s in trace.steps)}
""".strip()


SYSTEM_PROMPT = """You are an expert LLM agent debugger. 
You receive pre-computed metrics from deterministic scripts plus an agent execution summary.
Your job: identify SEMANTIC issues the scripts cannot detect.

Focus on:
1. Why loops happen (prompt ambiguity? missing exit condition? tool contract mismatch?)
2. Why steps fail (insufficient context? wrong tool for the task? input formatting?)  
3. Cross-step patterns (does the agent replan unnecessarily? is context degrading over time?)
4. Concrete fixes (specific prompt changes, architecture suggestions)

Respond ONLY with valid JSON. No preamble, no markdown fences.
Schema:
{
  "root_cause": "string — primary reason for observed issues",
  "patterns": ["string — pattern 1", "string — pattern 2"],
  "fixes": [
    {
      "priority": "high|medium|low",
      "area": "prompt|architecture|tooling|context",
      "description": "string — what to fix",
      "example": "string — concrete example or before/after"
    }
  ],
  "confidence": 0.0-1.0
}"""


async def analyze_trace(trace: Trace) -> LLMInsight:
    """
    Run Claude semantic analysis on a pre-processed trace.
    Scripts run first to minimize tokens sent to Claude.
    """
    api_key = _get_api_key()

    # Scripts first — reduce LLM input
    loops = detect_loops(trace.steps)
    latency = compute_latency_metrics(trace.steps)
    cost = compute_cost(trace.steps)

    script_results = {"loops": loops, "latency": latency, "cost": cost}
    context = _build_context(trace, script_results)

    payload = {
        "model": MODEL,
        "max_tokens": 1024,
        "system": SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": context}],
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            ANTHROPIC_API_URL,
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json=payload,
        )
        response.raise_for_status()

    data = response.json()
    raw_text = data["content"][0]["text"]
    tokens_used = data.get("usage", {}).get("input_tokens", 0) + data.get("usage", {}).get("output_tokens", 0)

    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        # Fallback si Claude devuelve texto
        return LLMInsight(
            root_cause="Could not parse LLM response",
            tokens_used=tokens_used,
        )

    return LLMInsight(
        root_cause=parsed.get("root_cause", ""),
        patterns=parsed.get("patterns", []),
        fixes=parsed.get("fixes", []),
        confidence=parsed.get("confidence", 0.0),
        tokens_used=tokens_used,
    )


async def estimate_cost_of_analysis(trace: Trace) -> dict:
    """Preview cost before running LLM analysis."""
    loops = detect_loops(trace.steps)
    latency = compute_latency_metrics(trace.steps)
    cost = compute_cost(trace.steps)
    context = _build_context(trace, {"loops": loops, "latency": latency, "cost": cost})

    # Haiku pricing: $0.80/MTok input, $4.00/MTok output
    estimated_input_tokens = len(context) // 4
    estimated_output_tokens = 400  # typical response
    estimated_cost = (estimated_input_tokens / 1_000_000 * 0.80) + (estimated_output_tokens / 1_000_000 * 4.0)

    return {
        "estimated_input_tokens": estimated_input_tokens,
        "estimated_output_tokens": estimated_output_tokens,
        "estimated_cost_usd": round(estimated_cost, 6),
        "model": MODEL,
    }
