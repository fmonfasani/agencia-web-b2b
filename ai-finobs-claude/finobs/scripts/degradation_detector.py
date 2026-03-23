"""
Degradation detector — analiza tendencias sobre N runs históricos.
Detecta si un agente está degradando en el tiempo.
Usado por: finobs watch <agent_name_or_tenant>
"""
from dataclasses import dataclass, field
from pathlib import Path
import json

from finobs.scripts.trace_parser import load_tenant_traces, Trace, TRACES_DIR
from finobs.scripts.loop_detector import detect_loops
from finobs.scripts.metrics_aggregator import compute_latency_metrics
from finobs.scripts.cost_analyzer import compute_cost
from finobs.scripts.scoring import compute_overall_score


@dataclass
class TrendPoint:
    run_id: str
    timestamp: str
    overall_score: float
    p95_ms: float
    cost_usd: float
    loop_count: int
    error_count: int


@dataclass
class DegradationReport:
    target: str
    points: list[TrendPoint] = field(default_factory=list)
    trend: str = "stable"          # improving | stable | degrading | critical
    degrading_metrics: list[str] = field(default_factory=list)
    recommendation: str = ""


def analyze_degradation(target: str, last_n: int = 10) -> DegradationReport:
    """
    Carga los últimos N runs de un tenant/agente y detecta tendencias.
    """
    traces = _load_traces_for(target, last_n)

    if len(traces) < 2:
        report = DegradationReport(target=target)
        report.trend = "insufficient_data"
        report.recommendation = f"Need at least 2 runs. Found {len(traces)}."
        return report

    points = []
    for trace in traces:
        loops = detect_loops(trace.steps)
        latency = compute_latency_metrics(trace.steps)
        cost_data = compute_cost(trace.steps)
        errors = sum(1 for s in trace.steps if s.status == "error")

        # Score simplificado para trend
        from finobs.scripts.scoring import score_latency, score_cost, score_stability
        error_rate = errors / max(len(trace.steps), 1)
        scores = {
            "performance": score_latency(latency.get("p95", 0), latency.get("p99", 0), error_rate),
            "quality":     max(0, 100 - int(error_rate * 200)),
            "cost":        score_cost(cost_data.get("total_usd", 0), len(cost_data.get("waste_steps", []))),
            "stability":   score_stability(len(loops), error_rate, len(trace.steps)),
            "rag":         75,  # sin datos RAG en trend básico
        }

        points.append(TrendPoint(
            run_id=trace.run_id,
            timestamp=trace.metadata.get("flushed_at", ""),
            overall_score=compute_overall_score(scores),
            p95_ms=latency.get("p95", 0),
            cost_usd=cost_data.get("total_usd", 0),
            loop_count=len(loops),
            error_count=errors,
        ))

    return _compute_trend(target, points)


def _compute_trend(target: str, points: list[TrendPoint]) -> DegradationReport:
    report = DegradationReport(target=target, points=points)

    if len(points) < 2:
        report.trend = "insufficient_data"
        return report

    # Comparar primera mitad vs segunda mitad
    mid = len(points) // 2
    first_half = points[:mid]
    second_half = points[mid:]

    avg = lambda items, attr: sum(getattr(p, attr) for p in items) / len(items)

    metrics_to_check = [
        ("overall_score", "Overall Score", False),   # higher is better
        ("p95_ms",        "Latency p95",   True),    # lower is better
        ("cost_usd",      "Cost",          True),
        ("loop_count",    "Loops",         True),
        ("error_count",   "Errors",        True),
    ]

    degrading = []
    for attr, label, lower_is_better in metrics_to_check:
        avg_first  = avg(first_half, attr)
        avg_second = avg(second_half, attr)
        if avg_first == 0:
            continue
        pct = ((avg_second - avg_first) / avg_first) * 100
        is_worse = (pct > 10) if lower_is_better else (pct < -10)
        if is_worse:
            degrading.append(f"{label} ({pct:+.1f}%)")

    report.degrading_metrics = degrading

    latest_score = points[-1].overall_score
    if len(degrading) >= 3 or latest_score < 50:
        report.trend = "critical"
        report.recommendation = "Immediate intervention required. Multiple metrics degrading."
    elif len(degrading) >= 1:
        report.trend = "degrading"
        report.recommendation = f"Run `finobs audit {points[-1].run_id} --llm` for root cause analysis."
    elif avg(second_half, "overall_score") > avg(first_half, "overall_score") + 5:
        report.trend = "improving"
        report.recommendation = "Agent performance is improving."
    else:
        report.trend = "stable"
        report.recommendation = "No significant trend detected."

    return report


def _load_traces_for(target: str, last_n: int) -> list[Trace]:
    """Carga traces por tenant o por prefijo de run_id."""
    traces = load_tenant_traces(target)

    # Si no hay por tenant, buscar por prefijo de run_id
    if not traces and TRACES_DIR.exists():
        for path in sorted(TRACES_DIR.glob("trace_*.json")):
            raw = json.loads(path.read_text())
            if raw.get("run_id", "").startswith(target):
                from finobs.scripts.trace_parser import _parse
                traces.append(_parse(raw))

    # Ordenar por timestamp si está disponible
    traces.sort(key=lambda t: t.metadata.get("flushed_at", ""), reverse=False)
    return traces[-last_n:]
