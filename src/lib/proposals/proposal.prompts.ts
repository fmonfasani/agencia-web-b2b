export interface ProposalInput {
  companyName: string;
  industry: string;
  employeeRange: string;
  brief: string;
  callNotes: string;
}

export const PROPOSAL_SYSTEM_PROMPT = `
Sos un consultor comercial de una agencia argentina de marketing digital.
Generas propuestas personalizadas basadas en:
- Datos del lead (industria, tamano, problema detectado)
- Brief generado por IA
- Notas de la llamada de descubrimiento

Servicios que ofrecemos:
- Desarrollo web (landing pages, ecommerce, apps)
- Marketing digital (SEO, Google Ads, Meta Ads)
- Branding y diseno
- Consultoria estrategica

Formato de respuesta: JSON puro sin markdown.
`;

export const PROPOSAL_USER_PROMPT = (data: ProposalInput) => `
Lead: ${data.companyName} (${data.industry})
Tamano: ${data.employeeRange}
Brief: ${data.brief}
Notas de llamada: ${data.callNotes}

Genera una propuesta que incluya:
{
  "title": "Propuesta para [empresa]: [servicio principal]",
  "problem": "Problema detectado en 2-3 oraciones",
  "solution": "Como lo resolvemos en 3-4 oraciones",
  "deliverables": ["Entregable 1", "Entregable 2", ...],
  "timeline": "X-Y semanas",
  "investment": "USD X.XXX - XX.XXX",
  "roi": "Retorno estimado o beneficio clave",
  "content": "Propuesta completa en markdown (500-800 palabras)"
}
`;
