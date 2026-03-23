from collections import defaultdict
from finobs.scripts.trace_parser import TraceStep


def detect_loops(steps: list[TraceStep], threshold: int = 2) -> list[dict]:
    """Hash-based loop detection: same tool + same input_hash = loop."""
    fingerprints = defaultdict(list)

    for i, step in enumerate(steps):
        fp = f"{step.tool}:{step.input_hash}"
        fingerprints[fp].append(i)

    return [
        {
            "tool": fp.split(":")[0],
            "occurrences": len(indices),
            "step_indices": indices,
        }
        for fp, indices in fingerprints.items()
        if len(indices) > threshold
    ]
