import { OpenAIProvider } from "./providers/openai-generic";
import { AIProvider } from "./types";

/**
 * AI Fallback Engine
 * Poliza: Gradient -> Groq -> OpenAI -> Ollama Local
 */
export class AIEngine {
    private providers: AIProvider[] = [];

    constructor() {
        // 1. Groq (Fast)
        if (process.env.GROQ_API_KEY) {
            this.providers.push(new OpenAIProvider(
                process.env.GROQ_API_KEY,
                process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
                "https://api.groq.com/openai/v1",
                "Groq"
            ));
        }

        // 2. OpenAI (Relay)
        if (process.env.OPENAI_API_KEY) {
            this.providers.push(new OpenAIProvider(
                process.env.OPENAI_API_KEY,
                "gpt-4o-mini",
                undefined,
                "OpenAI"
            ));
        }

        // 3. Ollama (Local Fallback)
        const ollamaURL = process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1";
        this.providers.push(new OpenAIProvider(
            "ollama", // dummy key
            process.env.OLLAMA_MODEL || "qwen2.5-coder:7b",
            ollamaURL,
            "Ollama"
        ));

        // TODO: Add Gradient AI once SDK/Endpoint is confirmed
    }

    async generateWithFallback(messages: any[], tenantId?: string, options?: any): Promise<string> {
        for (const provider of this.providers) {
            if (!provider.isAvailable()) continue;

            console.log(`[AI Engine] Attempting with ${provider.name}...`);
            const response = await provider.generateResponse(messages, tenantId, options);

            if (response) {
                console.log(`[AI Engine] Success with ${provider.name}.`);
                return response;
            }

            console.warn(`[AI Engine] Provider ${provider.name} failed, falling back...`);
        }

        throw new Error("All AI providers failed.");
    }
}

export const aiEngine = new AIEngine();
