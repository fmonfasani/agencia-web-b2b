import OpenAI from "openai";
import { AIProvider } from "../types";
import { openaiChat } from "../../observability/openai-client";

export class OpenAIProvider implements AIProvider {
    name = "OpenAI";
    private client: OpenAI | null = null;
    private model: string;
    private isInternalOpenAI: boolean = false;

    constructor(apiKey?: string, model = "gpt-4o-mini", baseURL?: string, providerName?: string) {
        if (apiKey) {
            this.client = new OpenAI({ apiKey, baseURL });
        }
        this.model = model;
        if (providerName) this.name = providerName;
        // Si no hay baseURL o es la de OpenAI, lo marcamos como interno para usar el wrapper de FinOps
        this.isInternalOpenAI = !baseURL || baseURL.includes("api.openai.com");
    }

    isAvailable(): boolean {
        return !!this.client;
    }

    async generateResponse(messages: any[], tenantId?: string, options?: any): Promise<string | null> {
        if (!this.client) return null;
        try {
            // Si es OpenAI oficial y tenemos tenantId, usamos el wrapper de FinOps
            if (this.isInternalOpenAI && tenantId && (this.model === "gpt-4o" || this.model === "gpt-4o-mini")) {
                const response = await openaiChat({
                    tenantId,
                    model: this.model as "gpt-4o" | "gpt-4o-mini",
                    messages
                });
                return response.choices[0]?.message?.content || null;
            }

            // Fallback para otros proveedores (Groq, Ollama) o si no hay tenantId
            const completion = await this.client.chat.completions.create({
                model: this.model,
                messages,
                temperature: options?.temperature ?? 0.7,
                max_tokens: options?.max_tokens ?? 500,
                ...options
            });
            return completion.choices[0]?.message?.content || null;
        } catch (error) {
            console.error(`[AI ${this.name}] Error:`, error);
            return null;
        }
    }
}
