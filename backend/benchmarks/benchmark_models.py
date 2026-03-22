"""
Benchmark End-to-End: evalúa todos los modelos Ollama disponibles.
Mide latencia, calidad de JSON, capacidad de planning y costo relativo.

Uso:
    cd backend
    python benchmarks/benchmark_models.py
"""
import asyncio
import httpx
import json
import time
import statistics
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any

OLLAMA_URL = "http://localhost:11434"
BACKEND_URL = "http://localhost:8000"

# Modelos a evaluar
MODELS = [
    "qwen2.5:0.5b",
    "qwen2.5:7b",
    "qwen2:7b",
    "qwen2.5-coder:7b",
    "llama3.2",
    "glm4",
    "gemma2",
    "phi4",
]

# Prompts de evaluación
PLANNING_PROMPT = """
Task: buscar leads de software en Argentina
Context: No specific context found.
History: []

You are a multitenant expert agent.
Available tools: scrape, rag_search.

Respond STRICTLY in JSON:
{
    "thought": "brief reasoning",
    "action": "tool_name or 'none'",
    "is_finished": true/false
}
"""

FINISH_PROMPT = """
Task: buscar leads de software en Argentina
Context: I found 5 software companies in Argentina: MercadoLibre, Globant, OLX, Despegar, Mural.
History: [{"role":"assistant","content":"I searched and found relevant companies"}]

You are a multitenant expert agent.
Available tools: scrape, rag_search.

Respond STRICTLY in JSON:
{
    "thought": "brief reasoning",
    "action": "tool_name or 'none'",
    "is_finished": true/false
}
"""

# Dataset de queries para benchmark E2E
BENCHMARK_QUERIES = [
    # Simples — modelo debe terminar en 1-2 iteraciones
    {"query": "listar herramientas disponibles", "category": "simple", "expected_iters": 1},
    {"query": "qué puedes hacer?", "category": "simple", "expected_iters": 1},
    # Medianas — 2-3 iteraciones
    {"query": "buscar leads de software en Argentina", "category": "medium", "expected_iters": 2},
    {"query": "encontrar empresas de fintech en LATAM", "category": "medium", "expected_iters": 2},
    # Ambiguas — edge cases
    {"query": "hacer algo útil", "category": "ambiguous", "expected_iters": 3},
    {"query": "buscar todo", "category": "ambiguous", "expected_iters": 3},
]


@dataclass
class ModelBenchmarkResult:
    model: str
    prompt_type: str
    latency_ms: int
    valid_json: bool
    is_finished: bool
    action: str
    thought: str
    error: Optional[str] = None


@dataclass
class AgentBenchmarkResult:
    model: str
    query: str
    category: str
    total_ms: int
    iterations: int
    llm_calls: int
    avg_llm_ms: float
    success: bool
    error: Optional[str] = None


async def call_ollama_json(model: str, prompt: str, timeout: float = 60.0) -> Dict[str, Any]:
    """Call Ollama and parse JSON response."""
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(
            f"{OLLAMA_URL}/api/chat",
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": "Respond with valid JSON only."},
                    {"role": "user", "content": prompt},
                ],
                "stream": False,
                "format": "json",
            },
        )
        r.raise_for_status()
        content = r.json()["message"]["content"]
        return json.loads(content)


async def benchmark_model_json(model: str, prompt: str, prompt_type: str) -> ModelBenchmarkResult:
    """Test a single model's JSON generation quality and latency."""
    t0 = time.time()
    try:
        response = await call_ollama_json(model, prompt, timeout=90.0)
        latency_ms = int((time.time() - t0) * 1000)
        return ModelBenchmarkResult(
            model=model,
            prompt_type=prompt_type,
            latency_ms=latency_ms,
            valid_json=True,
            is_finished=bool(response.get("is_finished", False)),
            action=response.get("action", ""),
            thought=response.get("thought", "")[:80],
        )
    except json.JSONDecodeError as e:
        latency_ms = int((time.time() - t0) * 1000)
        return ModelBenchmarkResult(
            model=model, prompt_type=prompt_type, latency_ms=latency_ms,
            valid_json=False, is_finished=False, action="", thought="",
            error=f"JSON parse error: {e}",
        )
    except Exception as e:
        latency_ms = int((time.time() - t0) * 1000)
        return ModelBenchmarkResult(
            model=model, prompt_type=prompt_type, latency_ms=latency_ms,
            valid_json=False, is_finished=False, action="", thought="",
            error=str(e)[:100],
        )


async def benchmark_agent_e2e(model_name: str, query: str, category: str) -> AgentBenchmarkResult:
    """Test full agent execution via backend API with a given model override."""
    # For now we test the current backend (qwen2.5:0.5b)
    # TODO: when model switching is implemented, pass model_name
    t0 = time.time()
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            r = await client.post(
                f"{BACKEND_URL}/agent/execute",
                json={
                    "query": query,
                    "tenant_id": "benchmark_tenant",
                    "enable_detailed_trace": True,
                },
            )
        total_ms = int((time.time() - t0) * 1000)
        if r.status_code != 200:
            return AgentBenchmarkResult(
                model=model_name, query=query, category=category,
                total_ms=total_ms, iterations=0, llm_calls=0,
                avg_llm_ms=0, success=False, error=f"HTTP {r.status_code}",
            )
        body = r.json()
        llm_traces = body.get("llm_traces") or []
        avg_llm = statistics.mean(l["duration_ms"] for l in llm_traces) if llm_traces else 0
        return AgentBenchmarkResult(
            model=model_name,
            query=query,
            category=category,
            total_ms=total_ms,
            iterations=body.get("metadata", {}).get("iterations", 0),
            llm_calls=len(llm_traces),
            avg_llm_ms=avg_llm,
            success=True,
        )
    except Exception as e:
        return AgentBenchmarkResult(
            model=model_name, query=query, category=category,
            total_ms=int((time.time() - t0) * 1000),
            iterations=0, llm_calls=0, avg_llm_ms=0,
            success=False, error=str(e)[:100],
        )


def print_model_comparison_table(results: List[ModelBenchmarkResult]):
    """Print formatted comparison table."""
    print("\n" + "="*100)
    print("MODEL BENCHMARK — JSON QUALITY & LATENCY")
    print("="*100)

    # Group by model
    by_model: Dict[str, List[ModelBenchmarkResult]] = {}
    for r in results:
        by_model.setdefault(r.model, []).append(r)

    header = f"{'Model':<25} {'Avg ms':>8} {'JSON OK':>8} {'Finish%':>8} {'P-Latency':>10} {'F-Latency':>10}"
    print(header)
    print("-" * 100)

    rows = []
    for model, res in by_model.items():
        valid = [r for r in res if r.valid_json]
        planning = [r for r in res if r.prompt_type == "planning"]
        finish = [r for r in res if r.prompt_type == "finish"]

        avg_ms = statistics.mean(r.latency_ms for r in res) if res else 0
        json_pct = len(valid) / len(res) * 100 if res else 0
        finish_rate = sum(1 for r in finish if r.is_finished) / len(finish) * 100 if finish else 0
        p_lat = statistics.mean(r.latency_ms for r in planning) if planning else 0
        f_lat = statistics.mean(r.latency_ms for r in finish) if finish else 0

        rows.append((avg_ms, model, avg_ms, json_pct, finish_rate, p_lat, f_lat))

    rows.sort()  # Sort by avg latency
    for _, model, avg_ms, json_pct, finish_rate, p_lat, f_lat in rows:
        finish_indicator = "OK" if finish_rate >= 80 else ("~" if finish_rate >= 50 else "NO")
        print(f"{model:<25} {avg_ms:>7.0f}ms {json_pct:>7.0f}% {finish_rate:>6.0f}%{finish_indicator} {p_lat:>9.0f}ms {f_lat:>9.0f}ms")


def print_bottleneck_analysis(agent_results: List[AgentBenchmarkResult]):
    """Print bottleneck analysis from E2E results."""
    print("\n" + "="*80)
    print("E2E AGENT BENCHMARK")
    print("="*80)
    print(f"{'Query':<40} {'ms':>7} {'iters':>6} {'llm/iter':>9} {'status':>8}")
    print("-"*80)
    for r in agent_results:
        status = "OK" if r.success else f"ERR:{r.error[:15]}"
        llm_per_iter = f"{r.avg_llm_ms:.0f}ms" if r.llm_calls > 0 else "-"
        print(f"{r.query[:40]:<40} {r.total_ms:>7} {r.iterations:>6} {llm_per_iter:>9} {status:>8}")


async def run_benchmark():
    print("=" * 70)
    print("     AGENCIA B2B -- LLM BENCHMARK END-TO-END")
    print("=" * 70)
    print(f"\nModelos disponibles: {len(MODELS)}")
    print("Prompts: planning (sin contexto) + finish (con contexto)")

    # =========================================================================
    # FASE 1: Benchmark de calidad JSON y latencia por modelo
    # =========================================================================
    print("\n[FASE 1] Benchmarking JSON quality & latency por modelo...")
    print("(2 prompts × N modelos, 3 repeticiones)")

    model_results: List[ModelBenchmarkResult] = []
    tasks = []
    for model in MODELS:
        for rep in range(3):
            tasks.append(benchmark_model_json(model, PLANNING_PROMPT, "planning"))
            tasks.append(benchmark_model_json(model, FINISH_PROMPT, "finish"))

    # Run in batches of 4 to avoid overwhelming Ollama
    batch_size = 4
    for i in range(0, len(tasks), batch_size):
        batch = tasks[i:i+batch_size]
        batch_results = await asyncio.gather(*batch, return_exceptions=True)
        for r in batch_results:
            if isinstance(r, ModelBenchmarkResult):
                model_results.append(r)
                print(f"  {r.model:<25} {r.prompt_type:>10} {r.latency_ms:>6}ms  JSON:{r.valid_json}  finish:{r.is_finished}")
        # Small delay between batches
        await asyncio.sleep(0.5)

    print_model_comparison_table(model_results)

    # =========================================================================
    # FASE 2: Benchmark E2E del agente actual (qwen2.5:0.5b)
    # =========================================================================
    print("\n[FASE 2] Benchmarking E2E del agente actual...")
    agent_results: List[AgentBenchmarkResult] = []
    for q in BENCHMARK_QUERIES:
        print(f"  Running: {q['query'][:50]}...")
        result = await benchmark_agent_e2e("qwen2.5:0.5b", q["query"], q["category"])
        agent_results.append(result)
        print(f"    -> {result.total_ms}ms, {result.iterations} iters, success={result.success}")

    print_bottleneck_analysis(agent_results)

    # =========================================================================
    # FASE 3: Guardar resultados JSON
    # =========================================================================
    output = {
        "model_results": [
            {
                "model": r.model, "prompt_type": r.prompt_type,
                "latency_ms": r.latency_ms, "valid_json": r.valid_json,
                "is_finished": r.is_finished, "action": r.action,
                "error": r.error,
            }
            for r in model_results
        ],
        "agent_results": [
            {
                "model": r.model, "query": r.query, "category": r.category,
                "total_ms": r.total_ms, "iterations": r.iterations,
                "llm_calls": r.llm_calls, "avg_llm_ms": r.avg_llm_ms,
                "success": r.success, "error": r.error,
            }
            for r in agent_results
        ],
    }

    out_path = "benchmarks/results_latest.json"
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\n[OK] Resultados guardados en {out_path}")
    return output


if __name__ == "__main__":
    asyncio.run(run_benchmark())
