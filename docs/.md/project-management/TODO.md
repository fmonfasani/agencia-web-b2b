# OpenRouter Integration - TODO Checklist

## ✅ Completed

- [x] Create `backend-agents/core/config.py` (Pydantic Settings)
- [x] Remove legacy `backend-agents/config.py` (documentation file)
- [x] Implement `OpenRouterProvider` in `app/llm/openrouter_provider.py`
- [x] Create factory `app/llm/factory.py` with `get_llm_provider()`
- [x] Update imports to use `from core.config import settings`
- [x] Refactor `app/engine/planner.py` to use `llm_provider.complete()`
- [x] Update `app/engine/langgraph_engine.py` to accept `llm_provider`
- [x] Update `app/main.py` to inject provider via factory
- [x] Verify syntax - all files compile
- [x] Create `INTEGRATION_SUMMARY.md`

## ⚠️ Pending

- [ ] **Concurrency safety**: Add file lock for `openrouter_usage.json`
- [ ] **Unit tests**: Test provider rotation, reset logic, error handling
- [ ] **Integration tests**: Test with real OpenRouter API
- [ ] **Monitor endpoint**: Add `/metrics/openrouter` to view usage stats
- [ ] **Production validation**: Test under load with multiple keys
- [ ] **Documentation**: Update README with OpenRouter setup steps
- [ ] **Example `.env` file**: Provide template for users
- [ ] **Cleanup unused code**: Remove `OllamaAdapter` references if any remain
- [ ] **Verify imports**: Ensure no `from ..config` in app/ (all should be `from core.config`)

---

## Quick Validation

```bash
# 1. Compile check
cd backend-agents
python -m py_compile app/llm/**/*.py app/engine/**/*.py app/main.py

# 2. Import test
python -c "from app.llm.factory import get_llm_provider; print('OK')"

# 3. Run server
uvicorn app.main:app --reload --port 8000
```

---

**Last updated:** 2026-04-02
