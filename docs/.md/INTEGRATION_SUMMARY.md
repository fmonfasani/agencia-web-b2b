# OpenRouter Integration - Summary

## What Was Done

### 1. Centralized Configuration ✅
- Created `backend-agents/core/config.py` with Pydantic Settings
- All configuration now loaded from environment variables
- Supports: Ollama, Groq, OpenRouter

### 2. OpenRouter Provider ✅
- Implemented `OpenRouterProvider` with:
  - Multi-key rotation (least_used strategy)
  - Daily counter per key (persisted to JSON)
  - Automatic reset at midnight UTC
  - Backoff on rate limits (429) and errors (5xx)
  - 401 handling (mark key as exhausted)

### 3. Factory Pattern ✅
- Created `backend-agents/app/llm/factory.py`
- `get_llm_provider()` returns correct provider based on `LLM_PROVIDER`
- Supports: `ollama`, `groq`, `openrouter`

### 4. Runtime Integration ✅
- Modified `app/engine/planner.py`:
  - `planner_node` now uses `llm_provider.complete()` instead of `ollama_adapter.chat_json()`
  - Converts message format internally
  - Parses JSON response, handles errors
- Modified `app/engine/langgraph_engine.py`:
  - accepts `llm_provider` in constructor
  - passes it to `run_agent()`
- Modified `app/main.py`:
  - Imports `get_llm_provider`
  - creates provider instance and injects into engine

### 5. Clean Architecture ✅
- Removed legacy `backend-agents/config.py` (was documentation-only)
- Updated imports: `from core.config import settings` (consistent)
- All modified files compile without errors

---

## How to Use

### 1. Configure Environment

Create `.env` in `backend-agents/` with:

```bash
LLM_PROVIDER=openrouter
OPENROUTER_API_KEYS=sk-or-v1-xxxxx,sk-or-v1-yyyyy,sk-or-v1-zzzzz
OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_STRATEGY=least_used
OPENROUTER_MAX_DAILY_PER_KEY=45
DATABASE_URL=postgresql://user:pass@localhost/db
```

### 2. Run the Service

```bash
cd backend-agents
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Test

```bash
curl -X POST "http://localhost:8000/agent/execute" \
  -H "X-API-Key: your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "¿Qué servicios ofrecen?",
    "tenant_id": "test_tenant"
  }'
```

### 4. Monitor Usage

```python
from app.llm.openrouter_provider import OpenRouterProvider
provider = OpenRouterProvider()
stats = provider.get_stats()
print(stats)
```

---

## Files Modified

| File | Changes |
|------|---------|
| `backend-agents/core/config.py` | NEW - Centralized config |
| `backend-agents/app/llm/factory.py` | NEW - Factory pattern |
| `backend-agents/app/llm/openrouter_provider.py` | NEW - OpenRouter provider |
| `backend-agents/app/engine/planner.py` | MODIFIED - Use llm_provider.complete() |
| `backend-agents/app/engine/langgraph_engine.py` | MODIFIED - Accept llm_provider |
| `backend-agents/app/main.py` | MODIFIED - Inject provider via factory |
| `backend-agents/config.py` | DELETED - Was documentation |

---

## Next Steps (Optional)

- **Concurrency safety**: Add file lock for `openrouter_usage.json` writes
- **Metrics endpoint**: Expose `/metrics/openrouter` for Prometheus
- **Tests**: Unit tests for provider rotation logic
- **Streaming**: Support streaming responses if needed
- **OpenRouter Activity API**: Use as source of truth instead of local counters

---

## Architecture Diagram

```
Request → /agent/execute
         ↓
   get_llm_provider()  ← factory reads LLM_PROVIDER from settings
         ↓
   OpenRouterProvider() / OllamaProvider() / GroqProvider()
         ↓
   LangGraphEngine(tenant_id, llm_provider)
         ↓
   run_agent() → planner_node()
         ↓
   llm_provider.complete(system_prompt, messages)
         ↓
   [OpenRouter API with auto-rotation]
```

**Key benefit:** Swappable LLM backend without touching agent logic.
