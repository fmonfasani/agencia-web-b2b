import json
from pathlib import Path
from finobs.scripts.trace_parser import TraceStep

_PRICING_PATH = Path(__file__).parent.parent / "config" / "pricing.json"


def _load_pricing() -> dict:
    return json.loads(_PRICING_PATH.read_text())


def compute_cost(steps: list[TraceStep], model: str = "claude-sonnet-4-20250514") -> dict:
    pricing = _load_pricing()
    model_pricing = pricing.get(model, pricing["claude-sonnet-4-20250514"])

    total_input = sum(s.input_tokens for s in steps)
    total_output = sum(s.output_tokens for s in steps)

    cost_input = (total_input / 1_000_000) * model_pricing["input_per_mtok"]
    cost_output = (total_output / 1_000_000) * model_pricing["output_per_mtok"]

    return {
        "total_usd":      round(cost_input + cost_output, 6),
        "input_tokens":   total_input,
        "output_tokens":  total_output,
        "cost_breakdown": {"input": round(cost_input, 6), "output": round(cost_output, 6)},
        "waste_steps":    _detect_waste(steps),
        "model":          model,
    }


def _detect_waste(steps: list[TraceStep], ratio_threshold: float = 10.0) -> list[dict]:
    return [
        {
            "tool": s.tool,
            "input_tokens": s.input_tokens,
            "output_tokens": s.output_tokens,
            "ratio": round(s.input_tokens / max(s.output_tokens, 1), 2),
            "reason": "high_input_to_output_ratio",
        }
        for s in steps
        if (s.input_tokens / max(s.output_tokens, 1)) > ratio_threshold
    ]
