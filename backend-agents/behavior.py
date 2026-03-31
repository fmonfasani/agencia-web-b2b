from dataclasses import dataclass, field
from finobs.scripts.trace_parser import Trace
from finobs.scripts.loop_detector import detect_loops
from finobs.scripts.scoring import score_stability


@dataclass
class AgentResult:
    agent: str
    score: int
    summary: str
    issues: list[dict] = field(default_factory=list)
    metrics: dict = field(default_factory=dict)


async def analyze(trace: Trace) -> AgentResult:
    steps = trace.steps
    loops = detect_loops(steps)
    error_rate = sum(1 for s in steps if s.status == "error") / max(len(steps), 1)
    score = score_stability(len(loops), error_rate, len(steps))

    issues = []
    for loop in loops:
        issues.append({
            "severity": "high",
            "description": (
                f"Loop detected: tool='{loop['tool']}' "
                f"repeated {loop['occurrences']}x at steps {loop['step_indices']}"
            ),
            "recommendation": "Add loop guard — check result before re-invoking same tool with same input",
        })

    if len(steps) > 40:
        issues.append({
            "severity": "medium",
            "description": f"Excessive step count: {len(steps)} steps",
            "recommendation": "Review planner — may be generating redundant sub-tasks",
        })

    metrics = {
        "total_steps": len(steps),
        "loops_detected": len(loops),
        "loop_detail": loops,
        "error_rate": round(error_rate, 3),
    }

    summary = f"{len(loops)} loops" if loops else "no loops"
    return AgentResult(agent="behavior", score=score, summary=summary, issues=issues, metrics=metrics)
