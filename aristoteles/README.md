# Aristóteles — Orquestador Multi-IA

Sistema de planificación de código que usa tres IAs en pipeline para producir planes de implementación de alta calidad.

## Flujo

```
Tu tarea
   ↓
[OpenAI — Arquitecto]   → Crea el plan inicial de implementación
   ↓
[Gemini — Crítico]      → Analiza el plan, encuentra gaps y propone mejoras
   ↓
[Claude — Juez]         → Sintetiza ambas visiones → Plan final definitivo
   ↓
plan_final.md           → Listo para el equipo de desarrollo
```

## Setup

```bash
cd aristoteles

# 1. Instalar dependencias
pip install -r requirements.txt

# 2. Configurar API keys
cp .env.example .env
# Editá .env con tus keys reales

# 3. Listo
```

## Uso

```bash
# Forma más simple
python aristoteles.py "Crear sistema de autenticación JWT con refresh tokens"

# Con archivo de salida personalizado
python aristoteles.py "API REST para e-commerce" --output plan_ecommerce.md

# Modo interactivo (te pide la tarea)
python aristoteles.py --interactive

# Especificar modelo de OpenAI
python aristoteles.py "Mi tarea" --model gpt-4-turbo

# Via flag --task
python aristoteles.py --task "Refactorizar módulo de pagos"
```

## Output

Genera un archivo `.md` con:
- Plan definitivo sintetizado por Claude
- Plan original de OpenAI (colapsado)
- Análisis crítico de Gemini (colapsado)

## API Keys necesarias

| Variable | Servicio | Dónde obtenerla |
|---|---|---|
| `OPENAI_API_KEY` | ChatGPT / GPT-4o | platform.openai.com |
| `GOOGLE_API_KEY` | Gemini 1.5 Pro | aistudio.google.com |
| `ANTHROPIC_API_KEY` | Claude Opus | console.anthropic.com |
