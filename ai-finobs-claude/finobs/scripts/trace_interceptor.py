"""
Zero-dependency trace interceptor.
Use @traced("tool_name") on any function in your agent.
Call flush_trace(run_id) at the end to save the trace.
"""
import time
import uuid
import functools
from datetime import datetime, timezone

_current_spans: list[dict] = []
_run_id: str = str(uuid.uuid4())[:8]


def set_run_id(run_id: str):
    global _run_id
    _run_id = run_id


def traced(tool_name: str, tenant: str = "default"):
    """Decorator to trace any function call."""
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            span_id = f"span_{len(_current_spans):03d}"
            start = time.time()
            status = "success"
            result = None

            input_data = str(args[0]) if args else str(kwargs)
            input_tokens = _estimate_tokens(input_data)

            try:
                result = fn(*args, **kwargs)
            except Exception as e:
                status = "error"
                raise
            finally:
                output_data = str(result) if result else ""
                output_tokens = _estimate_tokens(output_data)
                duration_ms = (time.time() - start) * 1000

                _current_spans.append({
                    "span_id": span_id,
                    "name": tool_name,
                    "input": input_data[:500],
                    "duration_ms": round(duration_ms, 2),
                    "status": status,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "attributes": {
                        "input_tokens": input_tokens,
                        "output_tokens": output_tokens,
                    }
                })

            return result
        return wrapper
    return decorator


def flush_trace(run_id: str = None, tenant: str = "default") -> str:
    """Save accumulated spans to ~/.finobs/traces/trace_<run_id>.json"""
    from finobs.scripts.trace_parser import save_trace

    rid = run_id or _run_id
    trace_dict = {
        "run_id": rid,
        "tenant": tenant,
        "spans": list(_current_spans),
        "metadata": {
            "flushed_at": datetime.now(timezone.utc).isoformat(),
            "total_steps": len(_current_spans),
        }
    }
    path = save_trace(trace_dict)
    _current_spans.clear()
    return path


def _estimate_tokens(text: str) -> int:
    """Rough estimate: 1 token ≈ 4 chars"""
    return max(1, len(text) // 4)
