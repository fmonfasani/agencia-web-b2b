export const SCORING_PROMPT = `
Sos un experto en ventas B2B para una agencia que vende: web, marketing y ads.
Analizá este lead y asigná un score de oportunidad.

Datos del lead:
{LEAD_DATA}

Respondé SOLO en JSON:
{
  "score": 1-10,
  "scoreReason": "justificación concisa de por qué este score",
  "recommendedService": "web|marketing|ads|combo",
  "urgency": "alta|media|baja",
  "estimatedBudget": "bajo|medio|alto",
  "bestTimeToCall": "mañana|tarde|indiferente"
}

Criterios:
- 9-10: sitio viejo/inexistente + empresa activa + rubro con budget
- 7-8: tiene algo pero necesita mejoras claras
- 5-6: oportunidad tibia, vale intentar
- 3-4: ya tiene bastante resuelto
- 1-2: agencia competidora o sin presupuesto probable
`;
