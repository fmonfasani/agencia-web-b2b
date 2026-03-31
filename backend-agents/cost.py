from dataclasses import dataclass, field
from finobs.scripts.trace_parser import Trace
from finobs.scripts.cost_analyzer import compute_cost
from finobs.scripts.scoring import score_cost


@dataclass
class AgentResult:
    agent: str
    score: int
    summary: str
    issues: list[dict] = field(default_factory=list)
    metrics: dict = field(default_factory=dict)


async def analyze(trace: Trace) -> AgentResult:
    result = compute_cost(trace.steps)
    score = score_cost(result["total_usd"], len(result["waste_steps"]))

    issues = []
    from finobs.scripts.scoring import THRESHOLDS
    if result["total_usd"] > THRESHOLDS["cost_per_run_usd"]:
        issues.append({
            "severity": "high",
            "description": f"Run cost ${result['total_usd']:.4f} exceeds budget (${THRESHOLDS['cost_per_run_usd']})",
            "recommendation": "Consider using a cheaper model for non-critical steps",
        })
    if result["waste_steps"]:
        issues.append({
            "severity": "medium",
            "description": f"{len(result['waste_steps'])} steps with high input/output token ratio",
            "recommendation": "Trim context window — avoid re-injecting full history each step",
        })

    summary = f"${result['total_usd']:.4f}"
    return AgentResult(agent="cost", score=score, summary=summary, issues=issues, metrics=result)
