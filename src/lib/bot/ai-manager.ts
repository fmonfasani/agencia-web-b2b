import { MessageContext } from "./redis-context";
import type { LeadInfo } from "./lead-manager";
import { aiEngine } from "../ai/engine";

const isOllamaEnabled = !!(process.env.OLLAMA_BASE_URL || !process.env.OPENAI_API_KEY);

const MODEL_NAME = isOllamaEnabled
  ? (process.env.OLLAMA_MODEL || "qwen2.5-coder:7b")
  : "gpt-4o-mini";

console.log(`[AI Manager] Using Fallback Engine (Strategy) initialized.`);

const SYSTEM_PROMPT = `
Eres el asistente inteligente de Agencia Web B2B (AgenciaWebB2B.com). 
Tu objetivo es calificar potenciales clientes para nuestros servicios de Desarrollo Web, SEO y Marketing Digital.

Tu misión es guiar la conversación para obtener:
1. Nombre del contacto y Empresa.
2. Problema principal o necesidad tecnológica.
3. Presupuesto aproximado (si es posible, sin presionar).

Reglas de Oro:
- Sé profesional, empático y directo. Responde en Español.
- Si el usuario parece un "Bot" o SPAM, sé cortés pero breve.
- Si preguntan por precios, aclara que cada proyecto es único y lo ideal es una llamada de 15 min.
- Máximo 2 párrafos por respuesta.

NOTIFICACIÓN DE CALIFICACIÓN:
Al final de tu respuesta, si crees que tienes suficiente información para calificar al lead (Nombre, Empresa y Necesidad), incluye OBLIGATORIAMENTE el tag [QUALIFIED].
Si el usuario no es un fit para la agencia (ej. busca algo que no hacemos), incluye [DISQUALIFIED].
`;

import { getAgentKnowledge } from "../ai/knowledge";

/**
 * Generates an AI response based on conversation history.
 */
export async function generateAIResponse(
  history: MessageContext[],
  userMessage: string,
  tenantId?: string
): Promise<string> {
  try {
    const knowledge = tenantId ? await getAgentKnowledge(tenantId) : null;

    const messages = [
      {
        role: "system",
        content: `
          ${SYSTEM_PROMPT}

          ${knowledge ? `\n--- CONTEXTO ESPECÍFICO DEL AGENTE ---\n${knowledge}` : ""}
        `
      },
      ...history.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: "user", content: userMessage },
    ];

    const response = await aiEngine.generateWithFallback(messages);

    return response || "Lo siento, tuve un problema procesando tu mensaje. ¿Podrías repetirlo?";
  } catch (error) {
    console.error("[AI Manager] Error generating response:", error);
    return "Lo siento, estoy experimentando dificultades técnicas. Por favor, intenta más tarde.";
  }
}

/**
 * Analyzes the history to extract lead information in a structured format.
 */
export async function extractLeadData(
  history: MessageContext[],
  phone: string,
): Promise<LeadInfo | null> {

  try {
    const prompt = `
      Basado en la siguiente conversación de WhatsApp, extrae la información del lead en formato JSON.
      Campos: name, company, need, budget.
      Si no conoces un dato, deja el campo vacío "".
      
      Conversación:
      ${history.map((m) => `${m.role}: ${m.content}`).join("\n")}
      
      Responde SOLO el JSON purificado.
    `;

    const response = await aiEngine.generateWithFallback([{ role: "user", content: prompt }], {
      response_format: { type: "json_object" },
      temperature: 0,
    });

    const data = JSON.parse(response || "{}");
    return {
      ...data,
      phone,
      timestamp: new Date().toISOString(),
      status: "qualified",
    };
  } catch (error) {
    console.error("[AI Manager] Error extracting lead data:", error);
    return null;
  }
}
