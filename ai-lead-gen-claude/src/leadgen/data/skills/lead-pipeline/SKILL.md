---
name: lead-pipeline
description: "Cómo operar el pipeline completo de lead generation: discovery, pre-screen, analysis, export. Flags, umbrales, troubleshooting de bloqueos de Google, integración con ai-marketing-claude."
---

# Lead Pipeline — Guía de operación

## Arquitectura del pipeline

```
Google/Bing SERP
      ↓
discovery.py  (async, 2-5s delay entre queries)
      ↓
leads.db  status='discovered'
      ↓
prescreener.py  (concurrency=15, timeout=8s, 80KB max)
      ↓
leads.db  status='prescreened'
      ↓
analyzer.py  (concurrency=8, análisis completo)
      ↓
leads.db  status='analyzed'
      ↓
CSV export  →  ai-marketing-claude
```

## Comandos principales

### Pipeline completo

```bash
python pipeline.py run "<topic>" \
  --geo "<ciudad>" \
  --max 200 \
  --per-query 30 \
  --max-queries 8 \
  --min-opportunity 35 \
  --concurrency 15
```

### Solo discovery (para testear un nicho)

```bash
python pipeline.py discover "<topic>" --geo "<ciudad>" --max 50
```

### Ver ranking

```bash
python pipeline.py rank --limit 20
python pipeline.py rank --tier A
python pipeline.py rank --json  # output JSON para procesar
```

### Stats del DB

```bash
python pipeline.py stats
```

### Exportar a CSV

```bash
python pipeline.py export --output leads_export.csv --min-tier B
```

## Parámetros y cuándo cambiarlos

| Parámetro           | Default | Cuándo cambiar                             |
| ------------------- | ------- | ------------------------------------------ |
| `--max`             | 200     | Subir a 500 para sesiones largas nocturnas |
| `--per-query`       | 30      | Bajar a 10 para testeo rápido              |
| `--max-queries`     | 8       | Bajar a 4 si Google bloquea seguido        |
| `--min-opportunity` | 35      | Subir a 60 para filtrar solo los peores    |
| `--concurrency`     | 15      | Bajar a 5 en redes lentas                  |

## Troubleshooting de bloqueos de Google

### Síntomas

- Output: `"Google blocked on 'X' — switching to Bing"`
- Todos los resultados muestran `engine: bing`
- Pocos resultados por query (< 5)
- Requests lentos o timeouts en discovery

### Soluciones por severidad

**Bloqueo leve** (< 30% de queries bloqueadas):

- El sistema ya usa Bing como fallback automático
- No necesitás hacer nada

**Bloqueo moderado** (30-70%):

```bash
# Reducir volumen y aumentar delays
python pipeline.py run "<topic>" --max-queries 4 --per-query 10 --max 60
```

**Bloqueo total** (Google rechaza todo):

```bash
# Esperá 15-30 minutos y usá config mínima
python pipeline.py run "<topic>" --max-queries 3 --max 40
```

O corré en horario off-peak (madrugada).

### Por qué pasa

Google detecta scraping por:

- Muchas requests desde misma IP en poco tiempo
- User-Agent patterns repetitivos
- Falta de cookies de sesión real

El sistema usa delays aleatorios y UA rotation, pero no es infalible a volúmenes altos.

## Integración con ai-marketing-claude

El CSV exportado es directamente compatible:

```bash
# Exportar Tier A
python pipeline.py export --output leads_tierA.csv --min-tier A

# Analizar el primer lead con ai-marketing-claude
head -2 leads_tierA.csv | tail -1 | cut -d',' -f1 | xargs python ../ai-marketing-claude/scripts/analyze_page.py
```

### Columnas del CSV que usa ai-marketing-claude

| Columna             | Uso                                 |
| ------------------- | ----------------------------------- |
| `url`               | Input directo a analyze_page.py     |
| `domain`            | Identificación del lead             |
| `lead_rank_score`   | Priorización                        |
| `opportunity_score` | Qué tan mala es su situación actual |
| `marketing_score`   | Score actual de marketing (0-10)    |
| `seo_score`         | Para el reporte de auditoría        |
| `cta_count`         | Para contextualizar el análisis     |

## Estado del DB: ciclo de vida de un lead

```
discovered    → URL nueva, sin procesar
prescreened   → Pasó el filtro de oportunidad
analyzed      → Análisis completo completado
failed        → No se pudo acceder o parsear
exported      → (opcional, marcar manualmente)
```

Para procesar leads pendientes de sesiones anteriores:

```bash
# Los prescreened pendientes se procesan en la próxima corrida
python pipeline.py run "<mismo topic>" --max 0  # solo procesa pendientes
```

## Base de datos: columnas clave

```sql
-- Las más importantes para decisiones de outreach
SELECT
    domain,
    lead_tier,
    lead_rank_score,      -- 0-100: prioridad de contacto
    opportunity_score,    -- 0-100: qué tan malo es su marketing
    marketing_score,      -- 0-10: calidad actual de su marketing
    contact_email,        -- si fue enriquecido
    page_title,
    h1,
    cta_count,
    has_tracking,
    seo_score
FROM leads
WHERE status = 'analyzed'
ORDER BY lead_rank_score DESC;
```
