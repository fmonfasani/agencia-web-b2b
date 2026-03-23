"""
Diff engine — compara dos traces y detecta regresiones o mejoras.
Usado por: finobs compare <run_a> <run_b>
"""
from dataclasses import dataclass, field
from finobs.scripts.trace_parser import Trace
from finobs.scripts.loop_detector import detect_loops
from finobs.scripts.metrics_aggregator import compute_latency_metrics
from finobs.scripts.cost_analyzer import compute_cost


@dataclass
class DiffResult:
    run_a: str
    run_b: str
    regressions: list[dict] = field(default_factory=list)
    improvements: list[dict] = field(default_factory=list)
    unchanged: list[str] = field(default_factory=list)
    summary: str = ""


def diff_traces(trace_a: Trace, trace_b: Trace) -> DiffResult:
    metrics_a = _extract_metrics(trace_a)
    metrics_b = _extract_metrics(trace_b)

    result = DiffResult(run_a=trace_a.run_id, run_b=trace_b.run_id)

    checks = [
        ("p95_latency_ms",  "Latency p95",   "ms",  True),   # lower is better
        ("p99_latency_ms",  "Latency p99",   "ms",  True),
        ("total_cost_usd",  "Total cost",    "USD", True),
        ("loop_count",      "Loops",         "",    True),
        ("error_count",     "Errors",        "",    True),
        ("waste_steps",     "Token waste",   "",    True),
        ("total_steps",     "Step count",    "",    True),
    ]

    for key, label, unit, lower_is_better in checks:
        val_a = metrics_a.get(key, 0)
        val_b = metrics_b.get(key, 0)

        if val_a == 0 and val_b == 0:
            result.unchanged.append(label)
            continue

        pct_change = ((val_b - val_a) / max(abs(val_a), 0.0001)) * 100

        if abs(pct_change) < 5:
            result.unchanged.append(label)
            continue

        is_regression = (pct_change > 0) if lower_is_better else (pct_change < 0)
        entry = {
            "metric": label,
            "run_a": f"{val_a:.3f}{unit}" if isinstance(val_a, float) else f"{val_a}{unit}",
            "run_b": f"{val_b:.3f}{unit}" if isinstance(val_b, float) else f"{val_b}{unit}",
            "change_pct": round(pct_change, 1),
        }

        if is_regression:
            entry["severity"] = "high" if abs(pct_change) > 30 else "medium"
            result.regressions.append(entry)
        else:
            result.improvements.append(entry)

    # Resumen
    if not result.regressions and not result.improvements:
        result.summary = "No significant changes detected."
    elif result.regressions and not result.improvements:
        result.summary = f"{len(result.regressions)} regression(s), no improvements."
    elif result.improvements and not result.regressions:
        result.summary = f"{len(result.improvements)} improvement(s), no regressions."
    else:
        result.summary = f"{len(result.regressions)} regression(s), {len(result.improvements)} improvement(s)."

    return result


def _extract_metrics(trace: Trace) -> dict:
    loops = detect_loops(trace.steps)
    latency = compute_latency_metrics(trace.steps)
    cost = compute_cost(trace.steps)
    errors = sum(1 for s in trace.steps if s.status == "error")

    return {
        "p95_latency_ms": latency.get("p95", 0),
        "p99_latency_ms": latency.get("p99", 0),
        "total_cost_usd": cost.get("total_usd", 0),
        "loop_count":     len(loops),
        "error_count":    errors,
        "waste_steps":    len(cost.get("waste_steps", [])),
        "total_steps":    len(trace.steps),
    }
