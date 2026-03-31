from dataclasses import dataclass, field
from finobs.scripts.trace_parser import Trace


@dataclass
class AgentResult:
    agent: str
    score: int
    summary: str
    issues: list[dict] = field(default_factory=list)
    metrics: dict = field(default_factory=dict)


async def analyze(trace: Trace) -> AgentResult:
    steps = trace.steps
    total = len(steps)
    errors = [s for s in steps if s.status == "error"]
    error_rate = len(errors) / max(total, 1)

    # Detectar pasos con output muy bajo (posible respuesta vacía)
    low_output = [s for s in steps if s.output_tokens < 10]
    low_output_rate = len(low_output) / max(total, 1)

    score = 100
    score -= int(error_rate * 100 * 1.5)
    score -= int(low_output_rate * 100 * 0.8)
    score = max(0, score)

    issues = []
    if error_rate > 0.05:
        issues.append({
            "severity": "high",
            "description": f"High failure rate: {error_rate:.1%} of steps failed",
            "recommendation": "Add input validation before tool calls",
        })
    if low_output_rate > 0.10:
        issues.append({
            "severity": "medium",
            "description": f"{len(low_output)} steps produced near-empty outputs",
            "recommendation": "Check prompt clarity and context sufficiency",
        })

    metrics = {
        "total_steps": total,
        "error_count": len(errors),
        "error_rate": round(error_rate, 3),
        "low_output_steps": len(low_output),
    }

    summary = f"error_rate: {error_rate:.1%}"
    return AgentResult(agent="quality", score=score, summary=summary, issues=issues, metrics=metrics)
