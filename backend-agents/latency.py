from dataclasses import dataclass, field
from finobs.scripts.trace_parser import Trace
from finobs.scripts.metrics_aggregator import compute_latency_metrics
from finobs.scripts.scoring import score_latency


@dataclass
class AgentResult:
    agent: str
    score: int
    summary: str
    issues: list[dict] = field(default_factory=list)
    metrics: dict = field(default_factory=dict)


async def analyze(trace: Trace) -> AgentResult:
    metrics = compute_latency_metrics(trace.steps)
    error_rate = sum(1 for s in trace.steps if s.status == "error") / max(len(trace.steps), 1)

    score = score_latency(metrics["p95"], metrics["p99"], error_rate)
    issues = []

    from finobs.scripts.scoring import THRESHOLDS
    if metrics["p95"] > THRESHOLDS["latency_p95_ms"]:
        issues.append({
            "severity": "high",
            "description": f"p95 latency {metrics['p95']:.0f}ms exceeds threshold ({THRESHOLDS['latency_p95_ms']}ms)",
            "recommendation": "Profile slowest steps and consider caching or parallelization",
        })

    if error_rate > THRESHOLDS["error_rate_max"]:
        issues.append({
            "severity": "high",
            "description": f"Error rate {error_rate:.1%} exceeds threshold",
            "recommendation": "Review failed steps and add retry logic",
        })

    summary = f"p95: {metrics['p95']:.0f}ms"
    return AgentResult(agent="latency", score=score, summary=summary, issues=issues, metrics=metrics)
