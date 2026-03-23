import json
import hashlib
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

TRACES_DIR = Path.home() / ".finobs" / "traces"


@dataclass
class TraceStep:
    step_id: str
    tool: str
    input_tokens: int
    output_tokens: int
    duration_ms: float
    status: str
    input_hash: str = field(default="")
    raw_input: str = field(default="")


@dataclass
class Trace:
    run_id: str
    steps: list[TraceStep]
    tenant: str = "default"
    metadata: dict = field(default_factory=dict)


def load_trace(run_id: str) -> Optional[Trace]:
    path = TRACES_DIR / f"trace_{run_id}.json"
    if not path.exists():
        return None
    raw = json.loads(path.read_text())
    return _parse(raw)


def load_tenant_traces(tenant: str) -> list[Trace]:
    if not TRACES_DIR.exists():
        return []
    traces = []
    for path in TRACES_DIR.glob("trace_*.json"):
        raw = json.loads(path.read_text())
        if raw.get("tenant", "default") == tenant:
            traces.append(_parse(raw))
    return traces


def save_trace(trace_dict: dict) -> str:
    TRACES_DIR.mkdir(parents=True, exist_ok=True)
    run_id = trace_dict["run_id"]
    path = TRACES_DIR / f"trace_{run_id}.json"
    path.write_text(json.dumps(trace_dict, indent=2))
    return str(path)


def _parse(raw: dict) -> Trace:
    steps = []
    for span in raw.get("spans", []):
        attrs = span.get("attributes", {})
        steps.append(TraceStep(
            step_id=span.get("span_id", ""),
            tool=span.get("name", "unknown"),
            input_tokens=attrs.get("input_tokens", 0),
            output_tokens=attrs.get("output_tokens", 0),
            duration_ms=float(span.get("duration_ms", 0)),
            status=span.get("status", "unknown"),
            input_hash=_hash(str(span.get("input", ""))),
            raw_input=str(span.get("input", "")),
        ))
    return Trace(
        run_id=raw["run_id"],
        steps=steps,
        tenant=raw.get("tenant", "default"),
        metadata=raw.get("metadata", {}),
    )


def _hash(data: str) -> str:
    return hashlib.md5(data.encode()).hexdigest()[:8]
