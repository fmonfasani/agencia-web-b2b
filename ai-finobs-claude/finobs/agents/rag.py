from dataclasses import dataclass, field
from finobs.scripts.trace_parser import Trace
from finobs.scripts.scoring import score_rag


@dataclass
class AgentResult:
    agent: str
    score: int
    summary: str
    issues: list[dict] = field(default_factory=list)
    metrics: dict = field(default_factory=dict)


async def analyze(trace: Trace) -> AgentResult:
    rag_steps = [s for s in trace.steps if "rag" in s.tool.lower() or "retrieve" in s.tool.lower()]

    if not rag_steps:
        return AgentResult(
            agent="rag",
            score=100,
            summary="no RAG steps",
            metrics={"rag_steps": 0},
        )

    # Proxy de relevancia: ratio output/input tokens (bajo = recuperó pero no usó)
    relevance_scores = []
    for s in rag_steps:
        ratio = s.output_tokens / max(s.input_tokens, 1)
        relevance_scores.append(min(1.0, ratio * 2))

    avg_relevance = sum(relevance_scores) / len(relevance_scores)
    empty_steps = [s for s in rag_steps if s.output_tokens < 15]
    empty_rate = len(empty_steps) / len(rag_steps)

    score = score_rag(avg_relevance, empty_rate)
    issues = []

    from finobs.scripts.scoring import THRESHOLDS
    if avg_relevance < THRESHOLDS["rag_relevance_min"]:
        issues.append({
            "severity": "high",
            "description": f"Low RAG utilization: avg relevance proxy {avg_relevance:.2f}",
            "recommendation": "Review chunking strategy and embedding model",
        })
    if empty_rate > 0.2:
        issues.append({
            "severity": "medium",
            "description": f"{len(empty_steps)}/{len(rag_steps)} retrievals returned near-empty results",
            "recommendation": "Check retrieval thresholds and fallback strategy",
        })

    metrics = {
        "rag_steps": len(rag_steps),
        "avg_relevance_proxy": round(avg_relevance, 3),
        "empty_retrieval_rate": round(empty_rate, 3),
    }

    summary = f"relevance: {avg_relevance:.2f}"
    return AgentResult(agent="rag", score=score, summary=summary, issues=issues, metrics=metrics)
