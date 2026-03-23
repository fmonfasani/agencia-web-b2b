---
name: lead-outreach
description: "Genera mensajes de outreach personalizados para leads basándose en los gaps específicos detectados en el análisis. El mensaje menciona exactamente qué está mal en su marketing para demostrar que hiciste el trabajo. Cubre email frío, LinkedIn, y WhatsApp Business."
---

# Lead Outreach — Mensajes personalizados desde el análisis

## Principio fundamental

**El outreach genérico no funciona. El outreach que demuestra que estudiaste su sitio, sí.**

El pipeline ya tiene todos los datos para hacer esto. El mensaje no dice "podemos mejorar tu marketing" — dice exactamente qué está roto y por qué importa.

---

## Cómo obtener los datos del lead

```python
import db, json

def get_lead_data(domain: str) -> dict:
    with db.get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM leads WHERE domain=? AND status='analyzed' LIMIT 1",
            (domain,)
        ).fetchone()
        if not row:
            return {}

        lead = dict(row)
        lead["analysis"] = json.loads(row["raw_analysis"] or "{}")
        lead["prescreen"] = json.loads(row["raw_prescreen"] or "{}")
        return lead
```

---

## Construir el mensaje: proceso en 3 pasos

### Paso 1: Identificar los 2-3 gaps más críticos

Del `raw_analysis`, extraé los problemas más graves en este orden de impacto de venta:

| Gap                     | Por qué es buen argumento de venta                    |
| ----------------------- | ----------------------------------------------------- |
| Sin tracking/analytics  | "No sabés cuántas visitas perdés" → miedo a pérdida   |
| Sin meta description    | "Google no sabe de qué trata tu sitio" → SEO tangible |
| Sin CTAs                | "Los visitantes no saben qué hacer" → conversiones    |
| Sin H1                  | "Tu página principal no tiene jerarquía" → básico     |
| CTA genérico ("Submit") | "Estás dejando plata sobre la mesa" → pérdida directa |
| Sin social proof        | "No hay razón para confiar en vos" → credibilidad     |
| Sin schema.org          | "No aparecés en rich snippets" → visibilidad          |

**Regla: mencionar solo los 2-3 más críticos. Más que eso parece un ataque.**

### Paso 2: Personalizar el contexto

Usar del lead:

- `page_title` o `h1` → para mencionar su negocio específicamente
- `domain` → para mostrar que visitaste su sitio
- `serp_title` / `serp_snippet` → para mencionar cómo aparece en Google
- `tech_stack` (si fue enriquecido) → para mostrar conocimiento técnico
- `contact_email` → para el destinatario

### Paso 3: Elegir el tono según el tier

| Tier | Tono                                | CTA del mensaje                   |
| ---- | ----------------------------------- | --------------------------------- |
| A    | Directo, urgente, oferta concreta   | Auditoría gratuita de 20 min      |
| B    | Consultivo, sugerencia, sin presión | "¿Te interesa ver qué mejoraría?" |
| C    | Educativo, insight de valor         | Compartir recurso, no pedir nada  |

---

## Templates por canal

### Email frío (Tier A)

**Asunto:** `[dominio.com] — 3 cosas que encontré en tu sitio`

```
Hola [nombre si está disponible / "equipo de <empresa>"],

Vi tu sitio en [dominio.com] y encontré algunas cosas que probablemente estén afectando tus resultados:

→ [Gap crítico 1 en términos concretos]
   Por ejemplo: "Tu sitio no tiene Google Analytics — no podés saber de dónde vienen tus clientes."

→ [Gap crítico 2]
   Por ejemplo: "La página principal no tiene una llamada a la acción clara — los visitantes no saben qué hacer cuando llegan."

→ [Gap crítico 3 si hay]

No es una crítica — son cambios específicos que hacen diferencia real en cuántos visitantes se convierten en clientes.

Si te interesa, puedo mostrarte exactamente qué cambiaría y qué impacto esperaría. Sin compromiso, 20 minutos.

[Tu nombre]
[Tu empresa]
```

**Reglas del email:**

- Sin imágenes ni adjuntos en el primer contacto
- Asunto con el dominio del lead → tasa de apertura más alta
- Máximo 120 palabras en el cuerpo
- Un solo CTA claro al final

---

### LinkedIn (Tier A o B)

**Mensaje de conexión (300 chars máx):**

```
Hola [nombre], vi [dominio.com] y noté algo en el sitio que podría afectar las conversiones. ¿Tenés 10 minutos para comentarlo?
```

**Follow-up después de conectar:**

```
Gracias por conectar.

Lo que noté en [dominio.com]:
→ [Gap 1 concreto]
→ [Gap 2 concreto]

Son cosas específicas, no generalidades. ¿Te sirve verlo?
```

---

### WhatsApp Business (Tier A, solo con número confirmado)

```
Hola! Vi el sitio de [empresa] en [dominio.com].

Encontré [X] cosas concretas que probablemente están afectando las ventas online:

1. [Gap crítico 1]
2. [Gap crítico 2]

¿Te interesa que te muestre exactamente qué cambiaría?
```

---

## Ejemplos de gaps → lenguaje de outreach

| Lo que detectó el análisis          | Cómo lo decís en el mensaje                                                        |
| ----------------------------------- | ---------------------------------------------------------------------------------- |
| `has_tracking=0`                    | "Tu sitio no tiene analytics — no podés medir qué funciona y qué no"               |
| `cta_count=0`                       | "Los visitantes no tienen claro qué hacer cuando llegan a tu sitio"                |
| `meta_description=''`               | "Tu sitio no tiene descripción para Google — perdés clics orgánicos"               |
| `seo_score < 4`                     | "Tu sitio tiene problemas básicos de SEO que afectan cómo te encontrás"            |
| `trust_score < 4`                   | "No hay señales de confianza visibles — los visitantes dudan antes de contactarte" |
| `form_count=0`                      | "No tenés ningún formulario — ¿cómo capturás leads del sitio?"                     |
| `images_without_alt > 5`            | (técnico — no usar en outreach de primer contacto)                                 |
| `tracking_score < 5, has WordPress` | "Tenés WordPress pero sin los plugins que transforman visitas en clientes"         |

---

## Flujo completo de outreach desde el DB

```python
import db, json

def generate_outreach(domain: str, channel: str = "email") -> str:
    """
    Genera el mensaje de outreach para un dominio.
    channel: 'email' | 'linkedin' | 'whatsapp'
    """
    with db.get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM leads WHERE domain=? AND status='analyzed'",
            (domain,)
        ).fetchone()

    if not row:
        return f"No hay datos analizados para {domain}"

    lead = dict(row)
    analysis = json.loads(lead.get("raw_analysis") or "{}")
    scores = analysis.get("analysis", {})

    # Identificar gaps
    gaps = []
    if not scores.get("tracking", {}).get("tools_count", 1):
        gaps.append("sin analytics — no podés medir resultados")
    if scores.get("conversion", {}).get("cta_count", 1) == 0:
        gaps.append("sin llamada a la acción — los visitantes no saben qué hacer")
    if not analysis.get("analysis", {}).get("seo", {}).get("meta_description"):
        gaps.append("sin descripción para Google — perdés visibilidad orgánica")
    if lead.get("trust_score", 5) < 4:
        gaps.append("sin señales de confianza visibles")

    gaps = gaps[:3]  # máximo 3
    empresa = lead.get("page_title") or domain

    if channel == "email":
        subject = f"{domain} — {len(gaps)} cosas que encontré en tu sitio"
        body_gaps = "\n".join(f"→ {g.capitalize()}" for g in gaps)
        body = f"""Hola,

Vi el sitio de {empresa} ({domain}) y encontré algunas cosas concretas:

{body_gaps}

Son cambios específicos que afectan cuántos visitantes se convierten en clientes.

¿Te interesa que te muestre exactamente qué cambiaría? 20 minutos, sin compromiso."""
        return f"Asunto: {subject}\n\n{body}"

    elif channel == "linkedin":
        gap_text = gaps[0] if gaps else "algunas oportunidades de mejora"
        return f"Hola, vi {domain} y noté {gap_text}. ¿Tenés 10 minutos para comentarlo?"

    return "Canal no soportado"

# Uso:
# print(generate_outreach("agenciaejemplo.com", channel="email"))
```

---

## Secuencia de follow-up

Si no responden al primer mensaje:

**Día 3:** Compartir un insight de valor relacionado con su industria (no pedir nada).

**Día 7:** Follow-up corto:

```
Hola, solo quería saber si llegaste a ver el mensaje anterior sobre [dominio.com]. Sin apuro.
```

**Día 14:** Último intento con urgencia suave:

```
Voy a pasar este slot a otra empresa de [industria]. Si te interesa la revisión gratuita, avisame antes del [fecha].
```

Después de día 14: Marcar en el DB como `status='exported'` y no contactar más en esta sesión.

---

## Reglas de oro del outreach

- Siempre mencionar el dominio específico en el primer párrafo
- Nunca más de 3 gaps en un mensaje — parece un ataque
- El CTA siempre debe ser de bajo compromiso (20 min, charla, sin costo)
- No adjuntar nada en el primer email
- Si no hay email del dominio propio → no enviar a emails genéricos de hosting
