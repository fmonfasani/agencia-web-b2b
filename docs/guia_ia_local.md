# Guía: IA Local con Ollama para Webshooks

Esta guía detalla cómo configurar y usar el motor de IA local (Ollama) que impulsa el `backend-agents`.

> Última actualización: 2026-04-10

---

## 1. Modelo en Producción

El motor de agentes usa Ollama por defecto con:

| Variable | Valor actual | Notas |
|---|---|---|
| `DEFAULT_MODEL` | `gemma3:latest` | Modelo principal en producción |
| `OLLAMA_BASE_URL` | `http://ollama:11434` | Interno en Docker Compose |

Para cambiar el modelo, actualizar `DEFAULT_MODEL` en `backend-agents/.env` y reiniciar el container.

---

## 2. Modelos Recomendados

### Para desarrollo local (bajo consumo de RAM)
```bash
ollama pull qwen2.5:3b        # ~2GB RAM — rápido, ideal para tests
ollama pull gemma3:latest     # ~4GB RAM — mismo que producción
```

### Para desarrollo avanzado (mayor calidad)
```bash
ollama pull qwen2.5:7b        # ~5GB RAM — mejor razonamiento
ollama pull llama3.2:3b       # ~2.5GB RAM — multilenguaje sólido
```

> Los modelos `qwen2.5-coder` están pensados para generación de código — **no** son óptimos para el motor de agentes conversacionales de Webshooks.

---

## 3. Configuración en Docker Compose

El `docker-compose.prod.yml` ya incluye el servicio Ollama. Al levantar el compose, Ollama arranca pero **no descarga modelos automáticamente**.

Para descargar el modelo por primera vez:
```bash
# Con el container corriendo
docker exec -it <container-ollama> ollama pull gemma3:latest

# Verificar modelos disponibles
docker exec -it <container-ollama> ollama list
```

El modelo queda guardado en el volumen `ollama_data` — no se pierde al reiniciar.

---

## 4. Desarrollo Local (sin Docker)

```bash
# Iniciar servidor Ollama
ollama serve

# Descargar modelo (si no está)
ollama pull gemma3:latest

# Verificar
ollama list
```

Configurar en `backend-agents/.env`:
```env
OLLAMA_BASE_URL=http://localhost:11434
DEFAULT_MODEL=gemma3:latest
```

---

## 5. OpenRouter como Fallback Cloud

Si Ollama no está disponible o la consulta requiere más capacidad, el motor escala automáticamente a OpenRouter:

```env
# backend-agents/.env
OPENROUTER_API_KEYS=sk-or-v1-xxx,sk-or-v1-yyy   # varias keys — rotation automática
OPENROUTER_DEFAULT_MODEL=openai/gpt-3.5-turbo
OPENROUTER_STRATEGY=least_used
OPENROUTER_MAX_DAILY_PER_KEY=45
```

La rotación de keys se maneja en `backend-agents/app/llm/openrouter_provider.py` — usa la key con menos uso del día.

---

## 6. Configuración en VS Code (Continue)

Para usar IA local en el editor durante desarrollo:

```json
// .vscode/continue/config.json
{
  "models": [
    {
      "title": "Webshooks Local (gemma3)",
      "provider": "ollama",
      "model": "gemma3:latest"
    },
    {
      "title": "Webshooks Local (qwen2.5:3b)",
      "provider": "ollama",
      "model": "qwen2.5:3b"
    }
  ],
  "tabAutocompleteModel": {
    "title": "Autocomplete Local",
    "provider": "ollama",
    "model": "qwen2.5:3b"
  }
}
```

---

## 7. Troubleshooting

### "Connection refused" en Ollama
```bash
# Verificar que el container está corriendo
docker compose ps | grep ollama

# Ver logs
docker compose logs ollama --tail 20
```

### Modelo no encontrado
```bash
# Descargar el modelo
docker exec -it <ollama-container> ollama pull gemma3:latest
```

### Respuesta muy lenta (> 30s)
- Usar modelo más pequeño: `qwen2.5:3b` (< 3GB RAM)
- Verificar que el Droplet tiene suficiente RAM: mínimo 4GB para `gemma3:latest`
- Considerar OpenRouter para queries complejas

### LLM devuelve JSON inválido
El planner tiene fallback automático — si el LLM no retorna JSON válido, el agente marca `had_llm_error=True` y termina el turno sin romper. Ver `planner_node()` en `backend-agents/app/engine/planner.py`.
