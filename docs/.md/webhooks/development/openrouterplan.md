# OpenRouter Integration Plan - Agent Engine

## 1. Visión General

**Objetivo:** Implementar OpenRouter como provider de LLM con rotación automática de API keys para evitar límites de rate limiting (≈45 req/día por key en free tier).

**Estado actual (2026-04-02):** ✅ **COMPLETADO** - OpenRouterProvider implementado **e integrado** completamente. El flujo del agente ahora usa `llm_provider` desacoplado (factory pattern).

**Alcance esta iteración:**
- [x] Implementar OpenRouterProvider con gestión de keys, rotación y persistencia
- [x] Integrar provider en el runtime (reemplazar ollama_adapter)
- [x] Refactorizar planner.py para usar factory pattern
- [x] Limpiar arquitectura (config central en `core/config.py`)
- [ ] Testing y validación
- [ ] Concurrencia (file lock)

---

## 2. Tareas Detalladas (Checklist de Implementación)

### Fase 1: OpenRouterProvider ✅ COMPLETADO
- [x] Diseñar patrón OpenRouterKey (contador diario + backoff + persistencia)
- [x] Implementar `_select_key()` con estrategia least_used
- [x] Implementar `_mark_used()`, `_save_usage()`, `_load_usage()`
- [x] Implementar `complete()` con manejo de errores (429, 401, 5xx)
- [x] Implementar retry automático con rotación de keys
- [x] Implementar `get_stats()` para observabilidad
- [x] Logging estructurado con trace_id

**Archivo creado:** `backend-agents/app/llm/openrouter_provider.py` ✅

---

### Fase 2: Factory & Config ⚠️ PARCIAL

#### 2.1 Factory Pattern
- [x] Crear `backend-agents/app/llm/factory.py`
  - [x] `get_llm_provider()` → retorna instancia según settings
  - [x] `get_available_providers()` → lista providers instalados
- [ ] **Integrar factory en runtime** (reemplazar imports directos de ollama_adapter)

#### 2.2 Configuración ✅ COMPLETADO
- [x] **Crear `backend-agents/core/config.py`**:
  - [x] Pydantic Settings con todos los campos (ollama, groq, openrouter)
  - [x] UNICO source of truth para configuración
  - [x] Carga desde `.env`
- [x] Eliminar archivo legacy `backend-agents/config.py` (contenía documentación mezclada)
- [x] Actualizar imports:
  - `factory.py`: `from core.config import settings` ✅
  - `openrouter_provider.py`: `from core.config import settings` ✅
- [x] Definir variables .env:
  ```bash
  LLM_PROVIDER=openrouter|ollama|groq
  OPENROUTER_API_KEYS=key1,key2,key3
  OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet
  OPENROUTER_MAX_DAILY_PER_KEY=45
  OPENROUTER_STRATEGY=least_used
  OPENROUTER_USAGE_FILE=openrouter_usage.json
  ```

---

### Fase 3: Integración en Runtime ✅ COMPLETADO

#### 3.1 Refactor de `planner.py`
**Problema:** `planner.py` recibía `ollama_adapter` y llamaba a `chat_json()` hardcodeado.

**Cambios realizados:**
- [x] Modificar `build_agent_graph()` para inyectar `llm_provider` en lugar de `ollama_adapter`
- [x] Modificar `planner_node()` para usar `llm_provider.complete()` en lugar de `ollama_adapter.chat_json()`
  - Convierte formato de mensajes (extrae system_prompt, construye `llm_messages`)
  - Parsea respuesta JSON del LLM
  - Captura excepciones y las convierte a `_llm_error` en dict
- [x] Actualizar `run_agent()` signature:
  ```python
  async def run_agent(
      task: str,
      tenant_id: str,
      rag_retriever,
      llm_provider,  # ← NUEVO (reemplaza ollama_adapter)
      tool_registry,
      tracing_context=None,
  ) -> Tuple[List[Dict[str, str]], Dict[str, Any]]:
  ```
- [x] Agregar `import json` al inicio de `planner.py`
- [x] Mantener `AgentDecision.from_dict()` sin cambios (compatible)

#### 3.2 Actualizar `langgraph_engine.py`
- [x] Modificar `LangGraphEngine.__init__(self, tenant_id, llm_provider, tracing_context=None)`
- [x] Almacenar `self._llm_provider = llm_provider`
- [x] Pasar `llm_provider` a `run_agent()`

#### 3.3 Actualizar `app/main.py` (backend-agents)
- [x] Agregar import: `from app.llm.factory import get_llm_provider`
- [x] En endpoint `execute()`:
  ```python
  llm_provider = get_llm_provider()
  engine = LangGraphEngine(tenant_id=effective_tenant_id, llm_provider=llm_provider)
  ```
- [x] Eliminado uso de `OllamaAdapter` directamente

**Nota:** `backend-agents/main.py` (raíz) no se modifica porque ese es un servicio diferente (scrapers, no agent engine).

---

### Fase 4: Testing & Validación ⚠️ PENDIENTE

#### 4.1 Tests Unitarios

---

### Fase 4: Testing & Validación ❌ PENDIENTE

#### 4.1 Tests Unitarios
- [ ] Test `OpenRouterProvider._select_key()` con.keys limitadas
- [ ] Test rotación: count reaches max_daily → next key seleccionada
- [ ] Test reset diario: mock date change → counters reset
- [ ] Test manejo errores 429/401/5xx → backoff/exhaust marks
- [ ] Test `get_stats()` retorna estructura correcta

#### 4.2 Tests de Integración
- [ ] Test e2e con OpenRouter real (1 key, 1 request)
- [ ] Test fallback: primera key 429 → segunda key responde
- [ ] Test persistencia: restart provider → counters cargados desde JSON
- [ ] Test configuración por .env: diferentes modelos/strategies

#### 4.3 validación en prod-like
- [ ] Verificar que `openrouter_usage.json` se crea en el volumen correcto
- [ ] Verificar logging JSON con trace_id en cada request
- [ ] Verificar que `planner.py` usa provider (no ollama_adapter residual)
- [ ] Verificar que errores de OpenRouter no caen el agente

---

### Fase 5: Mejoras de Concurrencia ⚠️ PENDIENTE

**Riesgo actual:** `_save_usage()` y `_load_usage()` no son thread-safe. Múltiples workers escribiendo el mismo JSON pueden corrupt datos.

**Opciones:**
1. [ ] File lock (portalocker, fasteners) → sincronizar acceso a JSON
2. [ ] Switch a SQLite (más simple para concurrencia)
3. [ ] Redis como cache de contadores (para múltiples instancias)

**Recomendación:** Implementar file lock mínimo (portalocker) si deployment es multi-worker. Documentar limitación si es single-worker.

---

### Fase 6: Limpieza de Arquitectura ❌ PENDIENTE

**Archivos legacy/duplicados:**
1. [ ] `backend-agents/config.py` (raíz) → mover todo a `backend-agents/app/config.py`
2. [ ] Eliminar imports relativos rotos: `from ..config` vs `from ...config`
3. [ ] Verificar que TODOS los imports en `app/` usen `from app.*` (no `from ..`)
4. [ ] Remover código muerto: `groq_provider.py` si no existe o comentar en factory
5. [ ] `planner.py` limpio: sin referencias a `ollama_adapter`

**Objetivo:** Un solo source of truth para configuración (`app/config.py`) y sin código legacy en raíz.

---

### Fase 7: Features Avanzadas (Opcionales)

- [ ] **Tracking vía OpenRouter Activity API** (como source of truth, no solo contador local)
- [ ] **Timezone-aware resets** (reset a medianoche local, no UTC)
- [ ] **Webhook de notificación** cuando todas las keys estén exhaustas
- [ ] **Metrics endpoint** `/metrics/openrouter` para Prometheus
- [ ] **Dashboard** de uso de keys en admin panel
- [ ] **Soporte de streaming** en OpenRouterProvider (si se requiere)

---

## 3. Matriz de Estado Actual

| Componente | Estado | Notas |
|-----------|--------|-------|
| OpenRouterProvider | ✅ Implementado | Funcional, pero no integrado |
| Factory Pattern | ✅ Creado | `factory.py` existe |
| Config Normalizada | ❌ No | `config.py` mezcla docs + código |
| planner.py adaptado | ❌ No | Sigue con `ollama_adapter` hardcodeado |
| LangGraphEngine | ❌ No | No acepta `llm_provider` param |
| main.py wiring | ❌ No | No llama a `get_llm_provider()` |
| Tests unitarios | ❌ No | Cobertura 0% |
| Tests e2e | ❌ No | No probado con OpenRouter real |
| Concurrencia | ⚠️ No seguro | JSON write sin lock |
| Limpieza legacy | ❌ No | `config.py` raíz contaminado |

---

## 4. Flujo Esperado (Después de la Integración)

```python
# Startup
provider = get_llm_provider()  # ← Factory decide según LLM_PROVIDER

# Request /agent/execute
engine = LangGraphEngine(
    tenant_id=tenant_id,
    llm_provider=provider  # ← Inyectado
)
result, metadata = await engine.run(task=query)

# Dentro del planner
response = await llm_provider.complete(
    system_prompt=system,
    messages=history,
    model="claude-3.5-sonnet"  # opcional
)

# OpenRouterProvider internamente:
# 1. _select_key() → elige key con menor daily_count
# 2. _mark_used(key) → incrementa contador
# 3. POST https://openrouter.ai/api/v1/chat/completions
# 4. Si 429 → backoff + retry con otra key
# 5. Si 401 → marcar key como exhausta + retry
# 6. Si OK → return content, persist usage
```

---

## 5. Riesgos y Mitigaciones

| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|--------------|------------|
| Corrupción JSON por concurrencia | Alta | Media | Implementar file lock |
| planner.py difícil de refactor | Media | Baja | Hacer cambios incrementales, tests frecuentes |
| Dependencia circular imports | Media | Baja | Normalizar imports, usar absolute imports |
| OpenRouter limita más de 45/día | Alta | Media | Alertas当 remaining < 5, rotar keys manualmente |
| Factory no coverage de edge cases | Media | Baja | Tests unitarios exhaustivos |

---

## 6. Entregables

1. **openrouterplan.md** (este archivo) → visión general y checklist
2. **openrouter_integration_summary.md** → después de completar integración
3. **Test suite** → `tests/llm/test_openrouter_provider.py`
4. **Config ejemplo** → `.env.openrouter.example`
5. **Documentación operativa** → cómo agregar nuevas API keys, cómo interpretar logs

---

## 7. Cronograma Sugerido

| Día | Objetivo |
|-----|----------|
| Día 1 | Normalizar `config.py`, eliminar legacy |
| Día 2 | Refactor `planner.py` → usar `llm_provider` |
| Día 3 | Integrar factory en `main.py` + `langgraph_engine.py` |
| Día 4 | Testing manual con OpenRouter real (1 key) |
| Día 5 | Tests unitarios + locks de concurrencia |
| Día 6 | E2E test completo, documentación operativa |

---

## 8. Criterios de Éxito

- [ ] `/agent/execute` funciona con `LLM_PROVIDER=openrouter`
- [ ] Rotación automática: 46 requests → switch a segunda key
- [ ] Persistencia: restart service → counters preservados
- [ ] Logging JSON con `trace_id` rastreable en toda la llamada
- [ ] 0 imports rotos: `python -m py_compile backend-agents/app/**/*.py`
- [ ] Tests unitarios >80% coverage en `openrouter_provider.py`
- [ ] Documentación actualizada (README, .env.example)

---

## 9. Preguntas Abiertas

1. ¿Debemos soportar **streaming** en OpenRouterProvider? (actualmente `complete()` returns `str`)
2. ¿Implementar **cache de embeddings** o solo LLM? (OpenRouter solo es LLM, embeddings siguen en Ollama)
3. ¿Usar **Redis** para contadores en vez de JSON? (si múltiples instancias)
4. ¿Agregar **monitoring** custom (Grafana) o solo logs?

---

**Próxima sesión:** Comenzar por **Fase 2.2** → Normalizar `config.py`.
