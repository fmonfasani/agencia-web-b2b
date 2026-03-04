import OpenAI from "openai";
import { AIProvider } from "../types";

export class OpenAIProvider implements AIProvider {
    name = "OpenAI";
    private client: OpenAI | null = null;
    private model: string;

    constructor(apiKey?: string, model = "gpt-4o-mini", baseURL?: string, providerName?: string) {
        if (apiKey) {
            this.client = new OpenAI({ apiKey, baseURL });
        }
        this.model = model;
        if (providerName) this.name = providerName;
    }

    isAvailable(): boolean {
        return !!this.client;
    }

    async generateResponse(messages: any[], options?: any): Promise<string | null> {
        if (!this.client) return null;
        try {
            const completion = await this.client.chat.completions.create({
                model: this.model,
                messages,
                temperature: options?.temperature ?? 0.7,
                max_tokens: options?.max_tokens ?? 500,
            });
            return completion.choices[0]?.message?.content || null;
        } catch (error) {
            console.error(`[AI ${this.name}] Error:`, error);
            return null;
        }
    }
}
