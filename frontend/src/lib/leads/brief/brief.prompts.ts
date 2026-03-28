export const BRIEF_PROMPT = `
Generá un brief de venta pre-llamada para este lead.
Somos una agencia que vende web, marketing y ads en Argentina.

Datos del lead:
{LEAD_DATA}

Competidores encontrados:
{COMPETITORS_DATA}

Respondé en este formato exacto (markdown):

## BRIEF: {empresa}
**Score:** {score}/10
**Servicio recomendado:** {servicio}

**Qué hace la empresa:**
[2 líneas máximo]

**Su problema principal visible:**
[El dolor más obvio que podemos resolver]

**Por qué nos necesitan:**
[Argumento específico basado en sus datos reales]

**Cómo están sus competidores:**
- Competidor 1: [una línea]
- Competidor 2: [una línea]
- Competidor 3: [una línea]

**Opener sugerido:**
[Primera frase exacta para abrir la llamada, personalizada]

**Preguntas clave:**
1. [Pregunta que abre el dolor]
2. [Pregunta que califica presupuesto]
3. [Pregunta que cierra hacia propuesta]

**Señales de compra a buscar:**
[2-3 señales específicas de este rubro]
`;
