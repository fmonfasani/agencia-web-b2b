import numpy as np
from finobs.scripts.trace_parser import TraceStep


def compute_latency_metrics(steps: list[TraceStep]) -> dict:
    durations = [s.duration_ms for s in steps if s.duration_ms > 0]
    if not durations:
        return {"p50": 0, "p95": 0, "p99": 0, "total_ms": 0, "cold_start_ms": 0, "slowest_steps": []}

    return {
        "p50":          float(np.percentile(durations, 50)),
        "p95":          float(np.percentile(durations, 95)),
        "p99":          float(np.percentile(durations, 99)),
        "total_ms":     float(sum(durations)),
        "cold_start_ms": durations[0],
        "slowest_steps": sorted(
            [{"tool": s.tool, "ms": s.duration_ms} for s in steps],
            key=lambda x: x["ms"], reverse=True
        )[:5],
    }
