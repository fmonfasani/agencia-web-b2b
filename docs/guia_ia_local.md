# 🦙 Guía: Usando Webshooks con IA Local (Ollama)

Esta guía detalla cómo habilitar el **Cerebro Local** para este proyecto, tal como se hizo en AnaReiki. Esto permite desarrollo ilimitado sin depender de cuotas de OpenAI/Anthropic.

## 1. Motores Requeridos
Ya contamos con **Ollama** en el sistema. Modelos recomendados para este proyecto:
- **`qwen2.5-coder:7b`**: (Fuerte) Para lógica compleja de Next.js, Prisma y modelos de negocio multitenant.
- **`deepseek-coder:6.7b`**: (Especialista) Excelente para optimizaciones de bases de datos y seguridad.

## 2. Configuración en VS Code (Continue)
Instala la extensión **Continue** y agrega estos modelos locales a tu `config.json`:

```json
{
  "models": [
    {
      "title": "B2B Local (Coder)",
      "provider": "ollama",
      "model": "qwen2.5-coder:7b"
    }
  ],
  "tabAutocompleteModel": {
    "title": "B2B Autocomplete",
    "provider": "ollama",
    "model": "qwen2.5-coder:1.5b"
  }
}
```

## 3. Comandos Útiles (PowerShell)
```powershell
# Iniciar servidor Ollama
ollama serve

# Listar modelos disponibles
ollama list

# Descargar modelo si no está
ollama pull qwen2.5-coder:7b
```

## 4. Auditoría Local
Usa el comando `/analyze` (si tu entorno de agente lo soporta) para realizar una auditoría técnica rápida sin salir de tu editor y sin costo de tokens.

---
*Mantenemos la soberanía de nuestros datos y la velocidad de desarrollo con IA local.*
