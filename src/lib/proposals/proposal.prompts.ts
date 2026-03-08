export interface ProposalInput {
  companyName: string;
  industry: string;
  employeeRange: string;
  website?: string | null;
  intelligence?: string | null; // This will contain the Auditoría 4x4
  brief?: string | null;
  callNotes: string;
  fitScore?: number;
  intentScore?: number;
}

export const PROPOSAL_SYSTEM_PROMPT = `
Sos un consultor comercial Senior de una agencia argentina de software y marketing digital ("Revenue OS").
Estás por generar una propuesta comercial de ALTA PERCEPCIÓN DE VALOR basada en una auditoría previa (Auditoría 4x4).

Nuestros Servicios y Precios (Referencia en USD):
- Sitio Web (Landing page profesional / Next.js): $300 - $800.
- Agente Consulta (FAQ 24/7): $80 - $150/mes.
- Agente Recepcionista (Agendado y leads): $80 - $150/mes.
- Agente de Ventas (Pitch y calificación): $120 - $250/mes.
- Agente Presupuesto (Cotización automática + PDF): $120 - $150/mes.
- Agente Técnico (Soporte automático): $150 - $200/mes.
- Pack Automático Completo (Web + 5 agentes + CRM): $499 - $600/mes.

Estilo de Comunicación:
- Profesional, ejecutivo, en español rioplatense (voseo sutil: "Tu empresa", "Te proponemos").
- Enfocado en ROI, ahorro de costos operativos y escalabilidad sin staff humano.
- Orientado a resultados medibles.

Formato de respuesta:
- SOLO JSON puro, sin explicaciones ni markdown envolvente.
- Los montos deben ser realistas según la tabla anterior.
`;

export const PROPOSAL_USER_PROMPT = (data: ProposalInput) => `
Genera una propuesta personalizada para ${data.companyName}.

CONTEXTO ESTRATÉGICO (Auditoría 4x4):
${data.intelligence || data.brief || 'No hay auditoría previa disponible.'}

NOTAS DE LA LLAMADA DE DESCUBRIMIENTO:
${data.callNotes}

DATOS DEL LEAD:
- Industria: ${data.industry}
- Tamaño: ${data.employeeRange}
- Website: ${data.website || 'No disponible'}
- Fit Score: ${data.fitScore || 0}/100
- Intent Score: ${data.intentScore || 0}/100

Estructura requerida en el JSON:
{
  "title": "Propuesta Estratégica para ${data.companyName}: [Servicio Principal]",
  "problem": "Descripción del problema detectado en 2-3 oraciones enfocadas en el dolor del negocio",
  "solution": "Cómo nuestra solución de Software + IA resuelve el problema en 3-4 oraciones",
  "deliverables": [
    "Entregable 1: Detalle específico",
    "Entregable 2: Detalle específico",
    "Entregable 3: Detalle específico"
  ],
  "timeline": "Rango de semanas (ej: 4-6 semanas)",
  "investment": "Monto en USD (pago único o abono mensual sugerido según el servicio)",
  "roi": "Beneficio clave medible (ej: 40% ahorro en soporte, 2x leads agendados)",
  "content": "Propuesta completa en Markdown (MÍNIMO 600 palabras). Divide en secciones: # RESUMEN # ANÁLISIS DEL PROBLEMA # SOLUCIÓN INTEGRAL IA # ENTREGABLES # PLAN DE TRABAJO # INVERSIÓN Y ROI"
}
`;
