"""
Synthetic trace generator for testing finobs without real agents.
Usage:
    from finobs.scripts.trace_generator import generate_trace, Scenario
    trace = generate_trace(Scenario.LOOP)
"""
import uuid
import random
from enum import Enum
from finobs.scripts.trace_parser import save_trace


class Scenario(str, Enum):
    HEALTHY         = "healthy"
    LOOP            = "loop"
    LATENCY_SPIKE   = "latency_spike"
    TOKEN_WASTE     = "token_waste"
    RAG_POOR        = "rag_poor"
    MULTI_FAILURE   = "multi_failure"


TOOLS = [
    "search_documents",
    "call_api",
    "write_file",
    "read_context",
    "validate_output",
    "rag_retrieve",
    "llm_call",
]


def generate_trace(
    scenario: Scenario = Scenario.HEALTHY,
    run_id: str = None,
    steps: int = 20,
    tenant: str = "default",
    save: bool = True,
) -> dict:
    run_id = run_id or f"{scenario.value}_{str(uuid.uuid4())[:6]}"
    spans = _build_spans(scenario, steps)

    trace = {
        "run_id": run_id,
        "tenant": tenant,
        "scenario": scenario.value,
        "spans": spans,
        "metadata": {"generated": True, "steps": len(spans)},
    }

    if save:
        path = save_trace(trace)
        print(f"Trace saved: {path}")

    return trace


def _build_spans(scenario: Scenario, n: int) -> list[dict]:
    spans = []

    for i in range(n):
        tool = TOOLS[i % len(TOOLS)]
        duration = random.gauss(600, 150)
        input_tokens = random.randint(200, 800)
        output_tokens = random.randint(50, 300)
        status = "success"

        # Inject scenario-specific behavior
        if scenario == Scenario.LOOP and i in [4, 9, 14]:
            tool = "search_documents"
            input_tokens = 350  # mismo input = mismo hash → loop detectado

        elif scenario == Scenario.LATENCY_SPIKE and i == 7:
            duration = 6200.0

        elif scenario == Scenario.TOKEN_WASTE and i % 4 == 0:
            input_tokens = random.randint(3000, 8000)
            output_tokens = random.randint(10, 50)

        elif scenario == Scenario.RAG_POOR and tool == "rag_retrieve":
            input_tokens = random.randint(100, 200)
            output_tokens = random.randint(5, 20)

        elif scenario == Scenario.MULTI_FAILURE:
            if i in [4, 9, 14]:
                tool = "search_documents"
            if i == 7:
                duration = 5500.0
            if random.random() < 0.15:
                status = "error"

        spans.append({
            "span_id": f"span_{i:03d}",
            "name": tool,
            "input": f"input_data_step_{i}" if scenario != Scenario.LOOP else "query: relevant documents",
            "duration_ms": round(max(50.0, duration), 2),
            "status": status,
            "attributes": {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
            }
        })

    return spans


def seed_fixtures():
    """Generate all scenario fixtures for testing."""
    for scenario in Scenario:
        generate_trace(scenario=scenario, run_id=f"fixture_{scenario.value}", save=True)
    print("All fixtures generated in ~/.finobs/traces/")


if __name__ == "__main__":
    seed_fixtures()
