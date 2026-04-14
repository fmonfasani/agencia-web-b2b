# Sistema de Trazabilidad End-to-End — Agente IA
> Última actualización: 2026-04-10

---

## Resumen

El sistema captura trazabilidad completa de cada ejecución del agente:
```
Query → Embedding (Qdrant) → RAG → LLM (Ollama/OpenRouter) → Response
```

Cada ejecución genera un `trace_id` único y se persiste en `agent_request_traces`.

---

## Request a `/agent/execute`

**Endpoint:** `POST http://localhost:8000/agent/execute`  
**Autenticación:** `X-API-Key: wh_xxxxx`

```json
{
  "query": "¿Qué servicios ofrecen?",
  "tenant_id": "tenant_sistema_diagnostico",
  "conversation_id": "s_abc123",
  "enable_detailed_trace": false,
  "max_iterations": 5,
  "temperature": 0.7
}
```

| Campo | Tipo | Required | Default | Descripción |
|---|---|---|---|---|
| `query` | string | ✅ | — | Consulta del usuario (min 3, max 2000 chars) |
| `tenant_id` | string | ✅ | — | ID del tenant |
| `conversation_id` | string | ❌ | auto-gen | ID de sesión para historial (retornado en respuestas previas como `session_id`) |
| `enable_detailed_trace` | boolean | ❌ | false | Incluir trace paso a paso en la respuesta |
| `max_iterations` | int | ❌ | 5 | Límite de iteraciones del agente (1–10) |
| `temperature` | float | ❌ | 0.7 | Temperatura del LLM (0.0–2.0) |

---

## Response Structure

```json
{
  "trace_id": "uuid-autogenerado",
  "tenant_id": "tenant_sistema_diagnostico",
  "query": "¿Qué servicios ofrecen?",
  "session_id": "s_abc123",
  "iterations": 2,
  "result": [
    {"role": "assistant", "content": "Voy a buscar los servicios disponibles..."},
    {"role": "tool",      "content": "Encontré 3 servicios en la base de conocimiento..."},
    {"role": "assistant", "content": "Los servicios disponibles son: ..."}
  ],
  "metadata": {
    "tenant_id": "tenant_sistema_diagnostico",
    "iterations": 2,
    "llm_calls": 2,
    "tools_executed": ["search"],
    "results_count": 3,
    "finish_reason": "results_found",
    "model": "gemma3:latest",
    "embedding_ms": 85,
    "rag_ms": 42,
    "llm_ms": 9200,
    "had_llm_error": false
  },
  "total_duration_ms": 9450,
  "timestamp_start": "2026-04-10T15:30:00Z",
  "timestamp_end": "2026-04-10T15:30:09Z"
}
```

### Valores de `finish_reason`

| Valor | Significado |
|---|---|
| `results_found` | El agente encontró resultados accionables |
| `rag_only` | Se respondió solo con contexto RAG, sin herramientas |
| `max_iterations` | Se alcanzó el límite de iteraciones |
| `loop_detected` | El agente detectó que estaba repitiendo la misma herramienta |
| `llm_error` | Error al llamar al LLM |
| `embedding_error` | Error en la búsqueda de embeddings |
| `no_results` | No se encontraron resultados |
| `timeout` | Timeout de 60s superado |

---

## Session / Historial de Conversación

Cada ejecución retorna `session_id`. Para una conversación multi-turno:

```bash
# Turno 1 — sin session_id (se crea automáticamente)
curl -X POST http://localhost:8000/agent/execute \
  -H "X-API-Key: wh_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{"query": "¿Qué servicios ofrecen?", "tenant_id": "mi_tenant"}'

# Response incluye: "session_id": "s_abc123"

# Turno 2 — pasar el session_id para continuar la conversación
curl -X POST http://localhost:8000/agent/execute \
  -H "X-API-Key: wh_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{"query": "¿Y cuánto cuesta el segundo?", "tenant_id": "mi_tenant", "conversation_id": "s_abc123"}'
```

El historial se almacena en la tabla `agent_sessions` y se inyecta en el estado inicial del grafo LangGraph.

---

## Trazas en PostgreSQL

Cada ejecución se persiste en `agent_request_traces`:

```sql
SELECT trace_id, tenant_id, query, iterations, total_ms, finish_reason, created_at
FROM agent_request_traces
WHERE tenant_id = 'mi_tenant'
ORDER BY created_at DESC
LIMIT 10;
```

### GET /agent/traces

```bash
curl http://localhost:8000/agent/traces?limit=50 \
  -H "X-API-Key: wh_xxxxx"
```

### GET /metrics/agent

```bash
curl http://localhost:8000/metrics/agent \
  -H "X-API-Key: wh_xxxxx"
```

Retorna agregaciones por `finish_reason`: total queries, avg iterations, avg ms, errores.

---

## Análisis de Performance

Distribución típica de tiempos:

```
Total: ~10,000ms
├─ Embedding (Qdrant):  80–150ms   (< 2%)
├─ RAG search:          30–80ms    (< 1%)
├─ LLM (Ollama):       8,000–15,000ms  (~97%)   ← Bottleneck principal
└─ Overhead:           ~200ms      (< 2%)
```

**Llaves para mejorar latencia:**
- Usar `qwen2.5:3b` en lugar de `gemma3` para respuestas más rápidas (~30% menos)
- OpenRouter con `openai/gpt-3.5-turbo` reduce la latencia LLM a ~2s
- Si `embedding_ms > 500ms` → problema con el modelo de embeddings o la CPU del Droplet
- Si `rag_ms > 200ms` → Qdrant bajo carga o colección muy grande

---

## Estructura de Archivos (actual)

```
backend-agents/
└── app/
    ├── main.py                         # Endpoints /agent/execute, /agent/traces, /metrics/agent
    ├── session_service.py              # Historial de conversaciones (agent_sessions)
    ├── engine/
    │   ├── langgraph_engine.py         # Facade — LangGraphEngine.run()
    │   ├── planner.py                  # Nodos del grafo, GraphState, run_agent()
    │   ├── state.py                    # AgentDecision.from_dict()
    │   ├── adapters.py                 # RagRetriever, RegistryAdapter
    │   └── prompts.py                  # build_prompt()
    ├── llm/
    │   ├── factory.py                  # get_llm_provider()
    │   ├── ollama_provider.py          # Ollama
    │   └── openrouter_provider.py      # OpenRouter con key rotation
    ├── db/
    │   ├── pool.py                     # ThreadedConnectionPool
    │   └── trace_service.py            # persist_trace(), ensure_traces_table()
    └── auth/
        └── agent_auth.py               # get_user_by_api_key(), validate_tenant_access()

backend-saas/
└── app/
    └── db/
        └── pool.py                     # ThreadedConnectionPool (SaaS)
```

---

## Troubleshooting

### `had_llm_error: true` en metadata
El LLM retornó JSON inválido. El agente termina el turno de forma segura. Verificar:
- Modelo está descargado: `docker exec <ollama> ollama list`
- Logs del LLM: `docker compose logs backend-agents --tail 30`

### `finish_reason: "no_results"` con `rag_hits_count: 0`
No hay documentos indexados para ese tenant en Qdrant. Ingestar documentos primero:
```
POST /onboarding/ingest  (backend-agents)
```

### `finish_reason: "timeout"`
El agente superó 60 segundos. Causas comunes:
- Ollama lento (Droplet con poca RAM/CPU)
- Query muy compleja que genera muchas iteraciones
- Usar modelo más pequeño o reducir `max_iterations`

### `session_id` no aparece en la respuesta
Verificar que la tabla `agent_sessions` existe:
```bash
docker exec <postgres-container> psql -U postgres -d agencia_web_b2b_dev \
  -c "SELECT COUNT(*) FROM agent_sessions;"
```
Si falla, la tabla se crea automáticamente en el startup del servicio (`ensure_sessions_table()`).
