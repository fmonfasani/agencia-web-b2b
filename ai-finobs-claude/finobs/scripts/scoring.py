WEIGHTS = {
    "performance": 0.25,
    "quality":     0.25,
    "cost":        0.20,
    "stability":   0.15,
    "rag":         0.15,
}

THRESHOLDS = {
    "latency_p95_ms":     2000,
    "latency_p99_ms":     5000,
    "cost_per_run_usd":   0.50,
    "waste_ratio":        10.0,
    "loop_penalty":       20,
    "error_rate_max":     0.05,
    "rag_relevance_min":  0.70,
}


def compute_overall_score(scores: dict) -> float:
    return round(sum(scores[dim] * WEIGHTS[dim] for dim in WEIGHTS), 1)


def score_latency(p95: float, p99: float, error_rate: float) -> int:
    score = 100
    if p95 > THRESHOLDS["latency_p95_ms"]:
        score -= min(40, int((p95 - THRESHOLDS["latency_p95_ms"]) / 100))
    if p99 > THRESHOLDS["latency_p99_ms"]:
        score -= 20
    score -= int(error_rate * 100 * 2)
    return max(0, score)


def score_cost(total_usd: float, waste_count: int) -> int:
    score = 100
    if total_usd > THRESHOLDS["cost_per_run_usd"]:
        score -= min(40, int((total_usd - THRESHOLDS["cost_per_run_usd"]) * 50))
    score -= waste_count * 5
    return max(0, score)


def score_stability(loops: int, error_rate: float, step_count: int, expected_steps: int = 20) -> int:
    score = 100
    score -= loops * THRESHOLDS["loop_penalty"]
    score -= int(error_rate * 100 * 1.5)
    overflow = max(0, step_count - expected_steps * 1.5)
    score -= int(overflow * 2)
    return max(0, score)


def score_rag(avg_relevance: float, empty_rate: float) -> int:
    score = int(avg_relevance * 100)
    score -= int(empty_rate * 50)
    return max(0, min(100, score))
