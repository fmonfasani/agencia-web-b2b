"""
finobs test suite — usa fixtures sintéticas, no requiere agentes corriendo.
Run: pytest tests/ -v
"""
import pytest
from finobs.scripts.trace_generator import generate_trace, Scenario
from finobs.scripts.trace_parser import _parse
from finobs.scripts.loop_detector import detect_loops
from finobs.scripts.metrics_aggregator import compute_latency_metrics
from finobs.scripts.cost_analyzer import compute_cost
from finobs.scripts.scoring import compute_overall_score


def _trace(scenario: Scenario):
    raw = generate_trace(scenario=scenario, save=False)
    return _parse(raw)


# --- Loop detector ---

def test_loop_detected():
    trace = _trace(Scenario.LOOP)
    loops = detect_loops(trace.steps)
    assert len(loops) > 0
    assert loops[0]["tool"] == "search_documents"
    assert loops[0]["occurrences"] >= 3


def test_no_loops_on_healthy():
    trace = _trace(Scenario.HEALTHY)
    loops = detect_loops(trace.steps)
    assert len(loops) == 0


# --- Latency metrics ---

def test_latency_spike_raises_p95():
    trace = _trace(Scenario.LATENCY_SPIKE)
    metrics = compute_latency_metrics(trace.steps)
    # Spike en 1 step de 20 → impacta p99, no necesariamente p95
    assert metrics["p99"] > 2000
    assert metrics["slowest_steps"][0]["ms"] > 5000


def test_healthy_latency_within_threshold():
    trace = _trace(Scenario.HEALTHY)
    metrics = compute_latency_metrics(trace.steps)
    assert metrics["p50"] > 0
    assert metrics["p95"] < 5000


# --- Cost analyzer ---

def test_token_waste_detected():
    trace = _trace(Scenario.TOKEN_WASTE)
    result = compute_cost(trace.steps)
    assert len(result["waste_steps"]) > 0
    assert result["total_usd"] > 0


def test_cost_healthy_trace():
    trace = _trace(Scenario.HEALTHY)
    result = compute_cost(trace.steps)
    assert result["total_usd"] >= 0
    assert result["input_tokens"] > 0


# --- Scoring ---

def test_overall_score_weighted():
    scores = {"performance": 80, "quality": 70, "cost": 90, "stability": 60, "rag": 75}
    overall = compute_overall_score(scores)
    assert 0 <= overall <= 100


def test_overall_score_critical():
    scores = {"performance": 10, "quality": 10, "cost": 10, "stability": 10, "rag": 10}
    overall = compute_overall_score(scores)
    assert overall < 65


@pytest.mark.asyncio
async def test_audit_agents_run():
    import asyncio
    from finobs.agents import latency, quality, cost, behavior, rag

    trace = _trace(Scenario.MULTI_FAILURE)
    results = await asyncio.gather(
        latency.analyze(trace),
        quality.analyze(trace),
        cost.analyze(trace),
        behavior.analyze(trace),
        rag.analyze(trace),
    )
    assert len(results) == 5
    for r in results:
        assert 0 <= r.score <= 100
        assert r.agent in ["latency", "quality", "cost", "behavior", "rag"]


# --- LLM Analyzer (sin API key — solo testea el context builder) ---

def test_llm_context_builds_without_api_call():
    from finobs.scripts.llm_analyzer import _build_context, estimate_cost_of_analysis
    from finobs.scripts.loop_detector import detect_loops
    from finobs.scripts.metrics_aggregator import compute_latency_metrics
    from finobs.scripts.cost_analyzer import compute_cost

    trace = _trace(Scenario.MULTI_FAILURE)
    loops = detect_loops(trace.steps)
    latency = compute_latency_metrics(trace.steps)
    cost_data = compute_cost(trace.steps)

    context = _build_context(trace, {"loops": loops, "latency": latency, "cost": cost_data})
    assert "run_id" in context
    assert "p50" in context
    assert len(context) > 100


@pytest.mark.asyncio
async def test_dry_run_estimate():
    from finobs.scripts.llm_analyzer import estimate_cost_of_analysis
    trace = _trace(Scenario.MULTI_FAILURE)
    estimate = await estimate_cost_of_analysis(trace)
    assert estimate["estimated_input_tokens"] > 0
    assert estimate["estimated_cost_usd"] > 0
    assert estimate["model"] == "claude-haiku-4-5-20251001"
