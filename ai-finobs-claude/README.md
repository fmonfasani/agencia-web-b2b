# finobs — LLM Agent Observability Suite

Monitor, analyze and optimize LLM agents in production.

```bash
pip install finobs
```

## Commands

```bash
finobs audit run_123           # Full observability audit (5 agents in parallel)
finobs trace run_123           # Visualize execution trace
finobs loops run_123           # Detect loops and redundant steps
finobs cost run_123            # Cost breakdown by run
finobs cost tenant_abc         # Cost breakdown by tenant
finobs performance run_123     # Latency analysis (p50/p95/p99)
finobs debug run_123           # Debug failed steps
finobs debug run_123 --llm     # Debug with Claude semantic analysis (Phase 4)
```

## Instrument your agent

```python
from finobs import traced, flush_trace

@traced("search_documents")
def search_documents(query: str) -> str:
    ...

@traced("llm_call")
def call_llm(prompt: str) -> str:
    ...

# At end of run:
flush_trace(run_id="run_123", tenant="my_tenant")
```

## Generate test traces

```python
from finobs.scripts.trace_generator import generate_trace, Scenario

generate_trace(Scenario.LOOP)           # loop detection
generate_trace(Scenario.LATENCY_SPIKE)  # p95 spike
generate_trace(Scenario.TOKEN_WASTE)    # cost waste
generate_trace(Scenario.MULTI_FAILURE)  # combined issues
```

Then audit:

```bash
finobs audit loop_xxxxxx
```

## Scoring

| Dimension   | Weight |
| ----------- | ------ |
| Performance | 25%    |
| Quality     | 25%    |
| Cost        | 20%    |
| Stability   | 15%    |
| RAG         | 15%    |

Bands: 🟢 85–100 HEALTHY · 🟡 65–84 DEGRADED · 🔴 0–64 CRITICAL

## Development

```bash
git clone https://github.com/tu-org/finobs
cd finobs
pip install -e ".[dev,fastapi]"
pytest tests/ -v
```

## Roadmap

- [x] Phase 1 — CLI + trace interceptor + 5 analysis agents
- [x] Phase 2 — Scoring system + report generation
- [x] Phase 3 — Deterministic scripts (loop detector, cost analyzer, metrics)
- [ ] Phase 4 — Claude LLM semantic analysis (`--llm` flag)
- [ ] Phase 5 — Self-healing + A/B prompt comparison + degradation detection
