"""finobs — LLM Agent Observability Suite"""

__version__ = "0.1.0"

from finobs.scripts.trace_interceptor import traced, flush_trace

__all__ = ["traced", "flush_trace"]
