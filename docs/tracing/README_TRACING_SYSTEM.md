# 🔍 Sistema de Trazabilidad End-to-End para Agente AI

## 📋 Resumen Ejecutivo

Este sistema implementa **trazabilidad completa** del flujo de ejecución de agentes LangGraph, capturando cada paso desde el request inicial hasta la respuesta final.

### ✅ Lo que se logra:

1. **Visibilidad completa**: Query → Embedding → Qdrant → RAG → LLM → Response
2. **Debugging en producción**: Trace IDs que permiten correlacionar logs
3. **Performance analysis**: Timing de cada fase para identificar bottlenecks
4. **Observability**: Dashboard visual + raw JSON para análisis profundo

---

## 🎯 Request Structure

### Modelo del Request

```json
{
  "tenant_id": "tenant_acme",           // REQUIRED: ID del tenant
  "query": "Buscar empresas fintech",   // REQUIRED: consulta del usuario
  "enable_detailed_trace": true,        // OPTIONAL: trace paso a paso
  "trace_id": "custom_trace_001",       // OPTIONAL: ID custom para correlación
  "max_iterations": 5,                  // OPTIONAL: límite de iteraciones
  "temperature": 0.7                    // OPTIONAL: temperatura del LLM
}
```

### Campos del Request

| Campo | Tipo | Required | Default | Descripción |
|-------|------|----------|---------|-------------|
| `tenant_id` | string | ✅ | - | ID del tenant (multitenancy) |
| `query` | string | ✅ | - | Consulta del usuario (min 3 chars) |
| `enable_detailed_trace` | boolean | ❌ | false | Si true, retorna trace completo paso a paso |
| `trace_id` | string | ❌ | auto-generated | ID de tracing custom (para correlación) |
| `max_iterations` | int | ❌ | 5 | Máximo de iteraciones del agente |
| `temperature` | float | ❌ | 0.7 | Temperatura del LLM (0.0 - 2.0) |

---

## 📊 Response Structure

### Ejemplo de Response Completa

```json
{
  // Identificación
  "trace_id": "trace_abc123",
  "tenant_id": "tenant_acme",
  "query": "Buscar empresas fintech Argentina",
  
  // Resultado
  "result": [
    {"role": "assistant", "content": "Voy a buscar..."},
    {"role": "tool", "content": "Encontré 5 empresas..."}
  ],
  
  // Metadata general
  "metadata": {
    "tenant_id": "tenant_acme",
    "iterations": 2,
    "rag_queries": [...]
  },
  
  // Timing
  "total_duration_ms": 18500,
  "timestamp_start": "2026-03-22T15:30:00.000Z",
  "timestamp_end": "2026-03-22T15:30:18.500Z",
  
  // TRAZAS ESPECÍFICAS (siempre presentes)
  
  "embedding_trace": [
    {
      "model_name": "BAAI/bge-small-en-v1.5",
      "input_text": "Buscar empresas fintech Argentina",
      "input_length_chars": 32,
      "vector_dimension": 384,
      "duration_ms": 120,
      "vector_preview": [0.023, -0.145, 0.089, 0.234, -0.012]
    }
  ],
  
  "qdrant_trace": [
    {
      "collection_name": "agent_memory",
      "query_vector_preview": [0.023, -0.145, ...],
      "top_k": 5,
      "filter_applied": {"tenant_id": "tenant_acme"},
      "results_count": 5,
      "top_scores": [0.92, 0.87, 0.85],
      "duration_ms": 45,
      "chunks_found": [
        {
          "chunk_id": "chunk_001",
          "score": 0.92,
          "text_preview": "MercadoLibre es...",
          "metadata": {"source": "crunchbase"}
        }
      ]
    }
  ],
  
  "rag_context_trace": {
    "total_chunks": 5,
    "total_chars": 2450,
    "context_preview": "MercadoLibre es la empresa...",
    "chunk_sources": ["chunk_001", "chunk_002", ...]
  },
  
  "llm_traces": [
    {
      "model_name": "qwen2.5:0.5b",
      "provider": "ollama",
      "prompt_length_chars": 3200,
      "prompt_preview": "Eres un asistente...",
      "temperature": 0.7,
      "max_tokens": 500,
      "response_length_chars": 180,
      "response_preview": "Voy a buscar empresas...",
      "tokens_input": 850,
      "tokens_output": 45,
      "duration_ms": 8200,
      "finish_reason": "stop"
    }
  ],
  
  // TRACE DETALLADO (solo si enable_detailed_trace=true)
  
  "trace": [
    {
      "step_id": "trace_start",
      "step_type": "request_received",
      "timestamp": "2026-03-22T16:00:00.000Z",
      "duration_ms": null,
      "input_data": {...},
      "output_data": null,
      "metadata": null,
      "error": null
    },
    {
      "step_id": "validation",
      "step_type": "validation",
      "timestamp": "2026-03-22T16:00:00.050Z",
      "duration_ms": 2
    },
    {
      "step_id": "embedding_1",
      "step_type": "embedding_complete",
      "timestamp": "2026-03-22T16:00:00.170Z",
      "duration_ms": 120
    }
    // ... más steps
  ],
  
  "x_process_time": "18500ms"
}
```

---

## 🔍 Qué Observar en la Response

### 1. Timing Total
```json
"total_duration_ms": 18500
```
- **Esperado:** 15-30 segundos
- **Si > 30s:** Investigar `llm_traces[].duration_ms`
- **Si > 60s:** Timeout error

### 2. Embedding Trace
```json
"embedding_trace": [{
  "duration_ms": 120,
  "vector_dimension": 384
}]
```
- **Esperado:** 100-200ms
- **Si > 500ms:** Problema con modelo o CPU
- **Vector dim:** Debe ser 384 para BGE-small

### 3. Qdrant Search Trace
```json
"qdrant_trace": [{
  "results_count": 5,
  "top_scores": [0.92, 0.87, 0.85],
  "duration_ms": 45
}]
```
- **Esperado:** < 100ms
- **Results count:** Si es 0 → no hay docs indexados
- **Top scores:** > 0.7 es bueno, < 0.5 es irrelevante

### 4. RAG Context
```json
"rag_context_trace": {
  "total_chunks": 5,
  "total_chars": 2450
}
```
- **Total chars:** No debe exceder context window del LLM
- **Total chunks:** Si es 0 → búsqueda no retornó resultados

### 5. LLM Traces
```json
"llm_traces": [{
  "duration_ms": 8200,
  "tokens_input": 850,
  "tokens_output": 45,
  "finish_reason": "stop"
}]
```
- **Duration:** Mayor bottleneck (8-15s típico con Ollama)
- **Tokens:** Para calcular costos (input + output)
- **Finish reason:**
  - `"stop"` ✅ Completó normalmente
  - `"length"` ⚠️ Respuesta truncada (hit max_tokens)
  - `"error"` ❌ Error en el LLM

---

## 🚀 Uso

### 1. Request Básico (sin detailed trace)

```bash
curl -X POST http://localhost:8000/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "tenant_test",
    "query": "Buscar empresas de fintech en Argentina"
  }' | jq '.'
```

**Response:** Incluye trazas específicas (embedding, qdrant, rag, llm) pero NO el trace detallado.

### 2. Request con Detailed Trace

```bash
curl -X POST http://localhost:8000/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "tenant_test",
    "query": "Buscar empresas fintech Argentina",
    "enable_detailed_trace": true
  }' | jq '.trace'
```

**Response:** Incluye TODO + array `trace` con cada paso del flujo.

### 3. Request con Trace ID Custom

```bash
curl -X POST http://localhost:8000/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "tenant_test",
    "query": "Buscar empresas fintech",
    "trace_id": "frontend_request_001"
  }' | jq '.trace_id'
```

**Uso:** Correlacionar con logs de frontend/monitoring.

### 4. Extraer Solo Timing Info

```bash
curl -X POST http://localhost:8000/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "tenant_test",
    "query": "test timing"
  }' | jq '{
    trace_id,
    total_duration_ms,
    embedding_time: .embedding_trace[0].duration_ms,
    qdrant_time: .qdrant_trace[0].duration_ms,
    llm_time: (.llm_traces | map(.duration_ms) | add)
  }'
```

**Output:**
```json
{
  "trace_id": "trace_abc123",
  "total_duration_ms": 18500,
  "embedding_time": 120,
  "qdrant_time": 45,
  "llm_time": 18000
}
```

---

## 📈 Dashboard Visual

### Abrir el Dashboard

```bash
# 1. Abrir archivo HTML en el browser
open tracing_dashboard.html

# 2. O servir con Python
python -m http.server 8080
# Luego abrir: http://localhost:8080/tracing_dashboard.html
```

### Features del Dashboard

1. **Request Form:** Configurar tenant_id, query, detailed trace
2. **Execution Summary:** Trace ID, duration, iterations, status
3. **Timing Breakdown:** Chart visual de cada fase
4. **Embedding Trace:** Modelo, vector dimension, duration
5. **Qdrant Trace:** Results, scores, chunks encontrados
6. **RAG Context:** Total chunks, caracteres, preview
7. **LLM Traces:** Todas las llamadas con prompt/response preview
8. **Timeline:** Paso a paso de todo el flujo (si detailed trace está activado)
9. **Raw JSON:** Response completa para debugging

---

## 🧪 Tests Automatizados

### Correr Tests de Trazabilidad

```bash
# 1. Levantar backend
cd backend
DEFAULT_TENANT_ID=tenant_test \
ALLOW_FALLBACK_TENANT=true \
AUTH_SECRET=placeholder-secret \
TEST_DB_DSN="postgresql://..." \
uvicorn app.main:app --port 8000 &

# 2. Correr tests
pytest test_agent_tracing_complete.py -v -s
```

### Tests Incluidos

| Test | Validación |
|------|------------|
| `test_response_has_required_fields` | Estructura de response |
| `test_embedding_trace_is_captured` | Embedding trace completo |
| `test_qdrant_trace_is_captured` | Qdrant search trace |
| `test_rag_context_trace_is_captured` | RAG context trace |
| `test_llm_traces_are_captured` | LLM call traces |
| `test_detailed_trace_when_enabled` | Trace detallado completo |
| `test_detailed_trace_is_none_by_default` | Trace null cuando disabled |
| `test_custom_trace_id_is_preserved` | Trace ID propagation |
| `test_timing_breakdown_is_accurate` | Suma de timings |
| `test_error_trace_on_prompt_injection` | Error tracing |
| `test_tracing_overhead_is_minimal` | Performance overhead |

**Resultado esperado:** 11/11 PASSED

---

## 📦 Archivos del Sistema

```
backend/
├── app/
│   ├── main.py                         # Endpoint con tracing integrado
│   ├── langgraph_engine.py             # Engine con TracingContext
│   └── models/
│       ├── agent_request_model.py      # Pydantic models (Request/Response)
│       └── tracing_context.py          # Sistema de trazabilidad
│
└── tests/
    └── test_agent_tracing_complete.py  # Tests automatizados

frontend/
└── tracing_dashboard.html              # Dashboard visual

docs/
├── tracing_examples.py                 # Ejemplos de requests/responses
└── integration_example.py              # Guía de integración
```

---

## 🔧 Integración en tu Código Actual

### 1. Actualizar main.py

```python
from tracing_context import create_tracing_context

@app.post("/agent/execute", response_model=AgentResponse)
async def execute_agent(req: AgentRequest):
    # Crear contexto de trazabilidad
    ctx = create_tracing_context(
        tenant_id=req.tenant_id,
        query=req.query,
        enable_detailed_trace=req.enable_detailed_trace,
        trace_id=req.trace_id
    )
    
    # Pasar contexto al engine
    engine = LangGraphEngine(
        tenant_id=req.tenant_id,
        tracing_context=ctx  # ← NUEVO
    )
    
    result, metadata = await engine.run(req.query)
    
    # Construir response con trazas
    return AgentResponse(
        trace_id=ctx.trace_id,
        total_duration_ms=ctx.get_total_duration_ms(),
        embedding_trace=ctx.embedding_traces,
        qdrant_trace=ctx.qdrant_traces,
        rag_context_trace=ctx.rag_context_trace,
        llm_traces=ctx.llm_traces,
        trace=ctx.steps if req.enable_detailed_trace else None,
        ...
    )
```

### 2. Actualizar LangGraphEngine

```python
from tracing_context import TracingContext

class LangGraphEngine:
    def __init__(self, tenant_id: str, tracing_context: TracingContext = None):
        self.ctx = tracing_context
    
    async def run(self, task: str):
        # Embedding
        start_time = time.time()
        vector = self.embedding_model.encode(task).tolist()
        duration_ms = int((time.time() - start_time) * 1000)
        
        if self.ctx:
            self.ctx.add_embedding_trace(
                model_name="BAAI/bge-small-en-v1.5",
                input_text=task,
                vector=vector,
                duration_ms=duration_ms
            )
        
        # Qdrant search
        start_time = time.time()
        results = self.qdrant_client.search(...)
        duration_ms = int((time.time() - start_time) * 1000)
        
        if self.ctx:
            self.ctx.add_qdrant_trace(
                collection_name="agent_memory",
                query_vector=vector,
                top_k=5,
                filter_dict={"tenant_id": self.tenant_id},
                results=results,
                duration_ms=duration_ms
            )
        
        # ... resto del código
```

---

## 📊 Análisis de Performance

### Bottleneck Típico

```
Total: 18,500ms
├─ Embedding:   120ms  (0.6%)
├─ Qdrant:       45ms  (0.2%)
├─ LLM:      18,000ms  (97.3%)  ← BOTTLENECK
└─ Other:       335ms  (1.8%)
```

**Conclusión:** El LLM es el 97% del tiempo de ejecución.

### Optimizaciones Posibles

1. **Usar modelo más rápido:** qwen2.5:0.5b → tinyllama (reduce 50%)
2. **Cachear embeddings:** Si query repetida, skip embedding
3. **Parallel LLM calls:** Si hay múltiples iteraciones independientes
4. **Batch requests:** Agrupar múltiples queries en un solo request

---

## 🎓 Próximos Pasos

### Short-term (esta semana)
- [ ] Implementar en tu `main.py` actual
- [ ] Agregar health check en tests
- [ ] Testear con queries reales de clientes

### Medium-term (próximas 2 semanas)
- [ ] Integrar con logging system (Grafana/Prometheus)
- [ ] Agregar alertas por slowness (> 30s)
- [ ] Dashboard de métricas agregadas

### Long-term (1 mes)
- [ ] Machine learning para predecir timing
- [ ] Auto-scaling basado en load
- [ ] A/B testing de diferentes modelos LLM

---

## 🐛 Troubleshooting

### "embedding_trace is None"
**Causa:** El engine no tiene TracingContext  
**Solución:** Pasar `tracing_context=ctx` al constructor

### "qdrant_trace is empty"
**Causa:** No hay docs indexados para ese tenant  
**Solución:** Indexar docs con POST /embeddings/index

### "trace is None pero enable_detailed_trace=true"
**Causa:** Engine no está llamando `ctx.add_step()`  
**Solución:** Agregar `ctx.add_step()` en cada paso del engine

### "total_duration_ms no coincide con suma de fases"
**Causa:** Hay overhead no capturado (network, parsing, etc.)  
**Solución:** Es normal, el ~2% de overhead es esperado

---

## 📝 Changelog

### v1.0.0 (2026-03-22)
- ✨ Sistema de trazabilidad completo
- ✨ Dashboard visual HTML/JS
- ✨ Tests automatizados (11 tests)
- ✨ Ejemplos de integración
- ✨ Documentación completa

---

**¿Dudas?** Revisar `tracing_examples.py` para más casos de uso.
