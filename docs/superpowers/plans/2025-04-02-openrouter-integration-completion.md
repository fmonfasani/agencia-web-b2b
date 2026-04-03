# OpenRouter Integration Completion - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix critical bugs preventing OpenRouter integration from running (missing LLMProvider.model property, incorrect factory imports, undefined ollama_adapter reference in planner.py)

**Architecture:** The agent engine uses a factory pattern to provide LLM providers (Ollama, OpenRouter). The planner node calls `llm_provider.complete()` and needs access to `llm_provider.model` for metadata. The current code has three bugs: (1) LLMProvider interface lacks `model` property, (2) factory imports wrong module (`.ollama_client` instead of actual `OllamaProvider` class), (3) `planner.py` line 412 references undefined `ollama_adapter`.

**Tech Stack:** Python, FastAPI, LangGraph, Pydantic, httpx, OpenRouter API

---

## File Structure Analysis

**Files to modify:**
- `backend-agents/base.py` - Add abstract `model` property to LLMProvider interface
- `backend-agents/ollama_provider.py` - Implement `model` property
- `backend-agents/app/llm/openrouter_provider.py` - Implement `model` property, fix imports
- `backend-agents/app/llm/factory.py` - Fix import path for OllamaProvider
- `backend-agents/app/engine/planner.py` - Remove reference to `ollama_adapter.model`

**Dependencies:**
- `backend-agents/` is in Python path (sys.path.insert in main.py)
- `base.py` is at root level (`backend-agents/base.py`), not inside `app/`
- All files should import using absolute imports from root

---

## Phase 1: LLMProvider Interface — Add `model` Property

**Rationale:** The metadata returned by `run_agent()` includes `"model": ollama_adapter.model` (line 412). Since we're switching to provider-based architecture, the provider must expose its model name. We'll add an abstract property to the interface.

### Task 1.1: Update `base.py` with abstract model property

**Files:**
- Modify: `backend-agents/base.py:1-7`

- [ ] **Step 1:** Read current `base.py` to verify structure

```bash
cat "D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\backend-agents\base.py"
```

Expected output: Should show LLMProvider ABC with `complete()` abstract method.

- [ ] **Step 2:** Add abstract `model` property to LLMProvider

```python
from abc import ABC, abstractmethod

class LLMProvider(ABC):
    @property
    @abstractmethod
    def model(self) -> str:
        """Return the model name being used by this provider."""
        pass

    @abstractmethod
    async def complete(self, system_prompt: str, messages: list) -> str:
        pass
```

- [ ] **Step 3:** Write updated file with exact content

```python
from abc import ABC, abstractmethod

class LLMProvider(ABC):
    @property
    @abstractmethod
    def model(self) -> str:
        """Return the model name being used by this provider."""
        pass

    @abstractmethod
    async def complete(self, system_prompt: str, messages: list) -> str:
        pass
```

- [ ] **Step 4:** Compile check

```bash
cd "D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\backend-agents"
python -m py_compile base.py
```

Expected: No output (success).

- [ ] **Step 5:** Commit (will commit all changes at end of phase, but note for now)

---

### Task 1.2: Implement `model` property in `OllamaProvider`

**Files:**
- Modify: `backend-agents/ollama_provider.py:1-15`

- [ ] **Step 1:** Read current file

```bash
cat "D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\backend-agents\ollama_provider.py"
```

Expected: Shows class with `complete()` method, no `model` property.

- [ ] **Step 2:** Add `@property` method `model` returning `settings.ollama_model`

```python
import httpx
from llm.base import LLMProvider
from core.config import settings

class OllamaProvider(LLMProvider):
    @property
    def model(self) -> str:
        """Return the configured Ollama model."""
        return settings.ollama_model

    async def complete(self, system_prompt: str, messages: list) -> str:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{settings.ollama_base_url}/api/chat",
                json={
                    "model": settings.ollama_model,
                    "messages": [{"role": "system", "content": system_prompt}, *messages],
                    "stream": False
                },
                timeout=120,
            )
            resp.raise_for_status()
            return resp.json()["message"]["content"]
```

**Note:** Replace the entire file content. Ensure import order and structure match.

- [ ] **Step 3:** Compile check

```bash
cd "D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\backend-agents"
python -m py_compile ollama_provider.py
```

Expected: No output.

---

### Task 1.3: Implement `model` property in `OpenRouterProvider`

**Files:**
- Modify: `backend-agents/app/llm/openrouter_provider.py:1-296` (add property near top of class)

- [ ] **Step 1:** Read current file (already done earlier, but verify)

```bash
cat "D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\backend-agents\app\llm\openrouter_provider.py"
```

- [ ] **Step 2:** Add `@property` `model` after `__init__` or near top of class

Add this method inside `OpenRouterProvider` class (after `__init__` or before `complete()`):

```python
    @property
    def model(self) -> str:
        """Return the default model configured for OpenRouter."""
        return self.default_model
```

**Full updated class skeleton (only showing insertion point):**

```python
class OpenRouterProvider(LLMProvider):
    def __init__(self):
        # ... existing __init__ code ...
        logger.info(f"OpenRouterProvider iniciado con {len(self.api_keys)} keys. Límite diario: {self.max_daily}")

    @property
    def model(self) -> str:
        """Return the default model configured for OpenRouter."""
        return self.default_model

    def _load_usage(self):
        # ... rest of existing methods ...
```

- [ ] **Step 3:** Compile check

```bash
cd "D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\backend-agents"
python -m py_compile app/llm/openrouter_provider.py
```

Expected: No output.

---

## Phase 2: Fix Factory Imports

### Task 2.1: Update `factory.py` to import correct `OllamaProvider`

**Files:**
- Modify: `backend-agents/app/llm/factory.py:1-68`

**Issue:** Current code does `from .ollama_client import OllamaProvider` but `ollama_client.py` contains functions (`chat`, `chat_json`, `generate`) — not a class. The actual `OllamaProvider` class is in `backend-agents/ollama_provider.py` (root level).

**Solution:** Change import to absolute import from root: `from ollama_provider import OllamaProvider`

- [ ] **Step 1:** Check existing factory.py content

```bash
cat "D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\backend-agents\app\llm\factory.py"
```

- [ ] **Step 2:** Replace import line

Change:
```python
from .ollama_client import OllamaProvider
```

To:
```python
# Note: backend-agents/ is in sys.path, so we can import from root modules
from ollama_provider import OllamaProvider
```

**Full updated imports section:**

```python
"""
Factory para crear instancias de LLMProvider según configuración.
"""

from core.config import settings
from ollama_provider import OllamaProvider  # Changed: absolute import from root
from .openrouter_provider import OpenRouterProvider
```

- [ ] **Step 3:** Compile check

```bash
cd "D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\backend-agents"
python -c "from app.llm.factory import get_llm_provider; print('Factory imports OK')"
```

Expected: `Factory imports OK`

If error `ModuleNotFoundError: No module named 'ollama_provider'` → verify `backend-agents/ollama_provider.py` exists and `backend-agents/` is in Python path when running from that directory.

---

## Phase 3: Fix `planner.py` Undefined Reference

### Task 3.1: Replace `ollama_adapter.model` with `llm_provider.model`

**Files:**
- Modify: `backend-agents/app/engine/planner.py:412`

- [ ] **Step 1:** Read around line 412

```bash
sed -n '405,420p' "D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\backend-agents\app\engine\planner.py"
```

Expected output should include:
```python
        "model": ollama_adapter.model,
```

- [ ] **Step 2:** Replace that line with:

```python
        "model": llm_provider.model,
```

**Context (lines ~401-420 for verification):**

```python
    metadata = {
        "tenant_id": tenant_id,
        "iterations": result.get("iterations", 0),
        "llm_calls": result.get("llm_calls", 0),
        "tools_executed": result.get("tools_executed", []),
        "results_count": result.get("results_count", 0),
        "actionable_results_count": result.get("actionable_results_count", 0),
        "rag_hits_count": result.get("rag_hits_count", 0),
        "rag_queries": result.get("rag_queries", []),
        "rag_results": result.get("rag_results", []),
        "finish_reason": "llm_error" if agent_error else _finish_reason_from_state(result),
        "model": llm_provider.model,  # <-- CHANGED from ollama_adapter.model
        "tokens_used": 0,
        "embedding_ms": result.get("embedding_ms", 0),
        "rag_ms": result.get("rag_ms", 0),
        "llm_ms": result.get("llm_ms", 0),
        "had_embedding_fallback": result.get("had_embedding_fallback", False),
        "had_llm_error": result.get("had_llm_error", False),
        "error": agent_error,
    }
```

- [ ] **Step 3:** Compile check

```bash
cd "D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\backend-agents"
python -m py_compile app/engine/planner.py
```

Expected: No output.

---

## Phase 4: Fix OpenRouterProvider Imports

### Task 4.1: Update import path for `LLMProvider` in `openrouter_provider.py`

**Files:**
- Modify: `backend-agents/app/llm/openrouter_provider.py:9`

**Issue:** Current code uses `from ..base import LLMProvider`. Since `base.py` is at `backend-agents/base.py` and `openrouter_provider.py` is at `backend-agents/app/llm/openrouter_provider.py`, the correct relative import would be `from ...base import LLMProvider` (three dots) OR use absolute import `from base import LLMProvider` (since `backend-agents/` is in sys.path).

Better to use absolute import for clarity.

- [ ] **Step 1:** Check current import

```bash
head -n 15 "D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\backend-agents\app\llm\openrouter_provider.py" | grep "base import"
```

Expected: `from ..base import LLMProvider`

- [ ] **Step 2:** Change to absolute import

Replace:
```python
from ..base import LLMProvider
```

With:
```python
# backend-agents/ is in sys.path, so absolute import works
from base import LLMProvider
```

**Full updated top of file:**

```python
import os
import json
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import httpx
from pathlib import Path

from base import LLMProvider  # Changed from: from ..base import LLMProvider
from core.config import settings

logger = logging.getLogger(__name__)
```

- [ ] **Step 3:** Compile check

```bash
cd "D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\backend-agents"
python -m py_compile app/llm/openrouter_provider.py
```

Expected: No output.

---

## Phase 5: Comprehensive Validation

### Task 5.1: Compile check all modified files

- [ ] **Step 1:** Run py_compile on all critical files

```bash
cd "D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\backend-agents"
python -m py_compile base.py ollama_provider.py app/llm/factory.py app/llm/openrouter_provider.py app/engine/planner.py
```

Expected: No output, exit code 0.

- [ ] **Step 2:** If any errors, display them and stop

```bash
echo "If errors above, fix them before proceeding."
```

---

### Task 5.2: Test `get_llm_provider()` returns proper instance

- [ ] **Step 1:** Set environment for OpenRouter (or Ollama) and test import

```bash
cd "D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\backend-agents"
export LLM_PROVIDER=openrouter
export OPENROUTER_API_KEYS=sk-test123  # dummy key for instantiation only
export OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet
python -c "from app.llm.factory import get_llm_provider; p = get_llm_provider(); print(f'Provider: {type(p).__name__}, model: {p.model}')" 2>&1
```

Expected output:
```
Provider: OpenRouterProvider, model: anthropic/claude-3.5-sonnet
```

**Note:** If you get `ValueError: OPENROUTER_API_KEYS no configurado`, the provider won't fully initialize. That's fine — we're just testing that the factory returns the right class and that `model` property works. To test without a real key, we could add a mock key, but for now ensure the class instantiates. If it tries to validate the key, that's intended behavior.

- [ ] **Step 2:** Repeat for Ollama fallback

```bash
export LLM_PROVIDER=ollama
python -c "from app.llm.factory import get_llm_provider; p = get_llm_provider(); print(f'Provider: {type(p).__name__}, model: {p.model}')" 2>&1
```

Expected: `Provider: OllamaProvider, model: qwen2.5:0.5b` (or whatever is in `.env`)

If it tries to connect to Ollama and fails, that's OK — we're just checking the model property.

---

### Task 5.3: Verify planner imports `llm_provider` correctly

- [ ] **Step 1:** Check that `planner.py` imports `LLMProvider` for type hint (if used)

```bash
grep -n "LLMProvider" "D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\backend-agents\app\engine\planner.py"
```

Expected: Might show at line 148 `async def planner_node(state: GraphState, llm_provider, tool_registry)`. The type hint doesn't include a type annotation, which is fine. No further action needed.

- [ ] **Step 2:** Verify there is no remaining `ollama_adapter` reference in `app/engine/`

```bash
grep -r "ollama_adapter" "D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\backend-agents\app\engine\" || echo "No ollama_adapter references found (good)"
```

Expected: Should print "No ollama_adapter references found" or nothing. If it finds a match, fix it.

---

### Task 5.4: Quick start test (dry run)

- [ ] **Step 1:** Try starting the server to catch runtime import errors

```bash
cd "D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\backend-agents"
# Just test import chain, don't actually start server
python -c "from app.main import app; print('FastAPI app loaded successfully')" 2>&1
```

Expected: `FastAPI app loaded successfully`

If this fails with ImportError or NameError, fix immediately before proceeding.

---

## Phase 6: Optional Concurrency Safety (NOT blocking for MVP)

**Note:** The current `OpenRouterProvider._save_usage()` is not thread-safe. For single-worker deployments this is fine. For multi-worker, you'd need file locking. There is a TODO in `openrouterplan.md` about this. This is out of scope for the integration completion plan, but document as future work.

---

## Final Checklist

After completing all tasks:

- [ ] All `.py` files compile without errors
- [ ] `get_llm_provider()` returns correct provider instance with accessible `.model` property
- [ ] `planner.py:412` uses `llm_provider.model`, not `ollama_adapter.model`
- [ ] No `from ..base import` in `app/llm/openrouter_provider.py`
- [ ] Factory imports `OllamaProvider` from `ollama_provider.py` (root)
- [ ] FastAPI app imports successfully
- [ ] Both `OllamaProvider` and `OpenRouterProvider` implement the `model` property
- [ ] `base.py` defines `model` as abstract property

---

## Verification Commands (Run All)

```bash
cd "D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\backend-agents"

# 1. Compile all
python -m py_compile base.py ollama_provider.py app/llm/factory.py app/llm/openrouter_provider.py app/engine/planner.py

# 2. Import test
python -c "from app.llm.factory import get_llm_provider; from app.engine.planner import run_agent; from app.main import app; print('All imports OK')"

# 3. Provider instantiation (OpenRouter)
export LLM_PROVIDER=openrouter
export OPENROUTER_API_KEYS=dummy123
export OPENROUTER_DEFAULT_MODEL=test/model
python -c "from app.llm.factory import get_llm_provider; p=get_llm_provider(); print(p.model)" 2>&1 | grep -i error && echo "Got provider.model successfully" || echo "Errors found"

# 4. Search for any remaining ollama_adapter references
grep -r "ollama_adapter" app/ || echo "No ollama_adapter references in app/"

# 5. Quick syntax check of main.py
python -m py_compile app/main.py
```

Expected: All commands succeed without errors, no traceback, "All imports OK", "Got provider.model successfully", "No ollama_adapter references in app/".

---

## Rollback Safety

All changes are additive (adding property) or corrections of broken code. No functional regression risk:
- If `model` property missing → immediate NameError (easy to detect)
- If factory import wrong → ImportError (easy to detect)
- If `ollama_adapter` persists → NameError at runtime (detected in planner.py:412)

---

## Post-Integration Next Steps (from openrouterplan.md)

After these fixes, the integration is functionally complete. Optional improvements:
1. Add file lock for `openrouter_usage.json` (concurrency)
2. Add unit tests for `OpenRouterProvider` (rotation, backoff, stats)
3. Add `/metrics/openrouter` endpoint
4. Switch to OpenRouter Activity API as source of truth
5. Add streaming support if needed

---

**Plan prepared for execution.** Recommended: Use **superpowers:subagent-driven-development** to dispatch a fresh subagent per task with two-stage review, OR **superpowers:executing-plans** for inline batch execution with checkpoints.
