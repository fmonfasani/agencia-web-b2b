---
name: lead-scoring
description: "Cómo interpretar los scores del pipeline: prescreen_score, opportunity_score, marketing_score, lead_rank_score. Fórmulas, tiers A/B/C/D, y cómo usar los scores para priorizar outreach."
---

# Lead Scoring — Guía de interpretación

## El principio central

**Un lead valioso para servicios de marketing es una empresa con PEOR marketing.**

El pipeline invierte el scoring convencional: no buscamos los mejores sitios, buscamos los más mejorables.

```
marketing_quality_score  →  qué tan bueno es su marketing HOY
opportunity_score        →  100 - marketing_quality  →  qué tan mala es su situación
lead_rank_score          →  score final ponderado para priorizar outreach
```

## Scores en detalle

### Pre-screen score (0–100)

Calculado en `prescreener.py` con solo 80KB del HTML y 8s de timeout.

| Señal detectada                                     | Puntos          |
| --------------------------------------------------- | --------------- |
| Título presente (cualquier longitud)                | +10             |
| Título bien dimensionado (30-65 chars)              | +10 adicionales |
| Meta description presente                           | +10             |
| Meta description bien dimensionada (100-165 chars)  | +10 adicionales |
| H1 presente                                         | +15             |
| Tracking/analytics detectado (GA, GTM, Pixel, etc.) | +20             |
| ≥3 CTAs detectados en el texto                      | +15             |
| ≥3 social links                                     | +10             |
| **Total máximo**                                    | **100**         |

**`opportunity_score = 100 - prescreen_score`**

### Full analysis scores (0–10 cada uno)

Calculados en `analyzer.py` con análisis completo del HTML.

**seo_score** (base 10, descuentos):

- Sin título: -3
- Título fuera de rango: -1
- Sin meta description: -3
- Meta fuera de rango: -1
- Sin H1: -2
- Imágenes sin alt: -1 por imagen (máx -2)
- Problemas de jerarquía heading: -1
- Sin viewport meta: -1

**cta_score** (base 5):

- 0 CTAs → score=1
- 1-3 CTAs → score=7
- 4+ CTAs → score=8
- CTAs con texto descriptivo (>10 chars) → +1 (máx 10)

**trust_score** (base 5):

- 1-2 social links → +1
- 3+ social links → +2
- Schema.org presente → +1

**tracking_score**:

- 0 herramientas → 3
- 1 herramienta → 5
- 2 herramientas → 7
- 3+ herramientas → 9

### Marketing score (0–10)

```
marketing_score = avg(seo_score, cta_score, trust_score, tracking_score)
```

Es el promedio de los 4 scores del análisis completo.

### Lead rank score (0–100)

```python
opportunity = row["opportunity_score"]          # del pre-screen
marketing   = row["marketing_score"]            # del análisis completo (0-10)
lead_rank   = (opportunity * 0.7) + ((100 - marketing * 10) * 0.3)
lead_rank   = max(0, min(100, lead_rank))
```

**Por qué 70/30:** La oportunidad pesa más porque el pre-screen es el filtro de volumen. El análisis completo refina con precisión.

## Tiers y qué hacer con cada uno

### Tier A (75–100)

**Marketing muy pobre. Máxima prioridad.**

Típicamente tienen: sin meta, sin tracking, sin CTAs, título genérico.

Acción: Contactar dentro de los próximos 2 días. Usar `lead-outreach` con análisis detallado de sus brechas específicas.

### Tier B (55–74)

**Marketing mediocre. Vale la pena contactar.**

Típicamente tienen: tracking básico pero sin conversión, CTAs débiles, SEO incompleto.

Acción: Contactar en la semana. Mensaje más genérico, mencionar 1-2 mejoras concretas.

### Tier C (35–54)

**Marketing regular. Oportunidad moderada.**

Tienen algo de setup pero sin estrategia. Pueden no ser receptivos.

Acción: Agregar a lista de nurturing. Contactar solo si Tier A y B están agotados.

### Tier D (0–34)

**Ya tienen buen marketing. Descartar.**

Su marketing está bien armado. No son el cliente ideal para servicios de auditoría.

Acción: No contactar.

## Casos edge y cómo interpretarlos

### Score bajo pero empresa grande y conocida

Probablemente el sitio usa heavy JS (React/Next.js) y el parser estático no capturó el contenido.
→ Verificar manualmente antes de contactar.

### Score alto pero dominio sospechoso

Dominios con nombres genéricos (ej: `agencia-marketing-buenos-aires.com.ar`) pueden ser parked.
→ Revisar `page_title` y `h1` en el DB.

### Sin opportunity_score (NULL)

El lead fue descubierto pero no pasó el pre-screen (status=failed o discovered).
→ No incluir en outreach.

### opportunity_score = 100

Sitio completamente vacío de señales de marketing: sin título, sin meta, sin tracking, sin CTAs, sin social.
→ Verificar que no sea una página parked antes de invertir tiempo en outreach.

## Queries útiles para análisis de scoring

```sql
-- Distribución de scores por tier
SELECT lead_tier,
       COUNT(*) as total,
       ROUND(AVG(lead_rank_score), 1) as avg_rank,
       ROUND(AVG(opportunity_score), 1) as avg_opp,
       ROUND(AVG(marketing_score * 10), 1) as avg_mkt_pct
FROM leads WHERE status='analyzed'
GROUP BY lead_tier;

-- Leads Tier A con email encontrado (listos para outreach)
SELECT domain, contact_email, lead_rank_score, page_title
FROM leads
WHERE lead_tier='A' AND contact_email IS NOT NULL
ORDER BY lead_rank_score DESC;

-- El problema más común en Tier A
SELECT
    SUM(CASE WHEN has_tracking=0 THEN 1 ELSE 0 END) as sin_tracking,
    SUM(CASE WHEN cta_count=0 THEN 1 ELSE 0 END) as sin_ctas,
    SUM(CASE WHEN seo_score < 5 THEN 1 ELSE 0 END) as seo_pobre
FROM leads WHERE lead_tier='A';
```
