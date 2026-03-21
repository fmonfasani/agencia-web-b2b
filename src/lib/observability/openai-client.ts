import OpenAI from "openai"
import { prisma } from "@/lib/prisma"

const MODEL_COST = {
    "gpt-4o-mini": {
        input: 0.00000015,
        output: 0.0000006
    },
    "gpt-4o": {
        input: 0.0000025,
        output: 0.000010
    }
}

type OpenAIRequest = {
    tenantId: string
    model: keyof typeof MODEL_COST
    messages: any[]
}

let _client: OpenAI | null = null

function getClient(): OpenAI {
    if (!_client) {
        _client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        })
    }
    return _client
}

export async function openaiChat({
    tenantId,
    model,
    messages
}: OpenAIRequest) {
    const client = getClient()

    const response = await client.chat.completions.create({
        model,
        messages
    })

    const tokensInput = response.usage?.prompt_tokens || 0
    const tokensOutput = response.usage?.completion_tokens || 0

    const costUsd =
        tokensInput * MODEL_COST[model].input +
        tokensOutput * MODEL_COST[model].output

    // Persist cost event (non-blocking)
    prisma.apiCostEvent.create({
        data: {
            tenantId,
            api: "openai",
            endpoint: "chat.completions",
            model,
            tokensInput,
            tokensOutput,
            costUsd,
            timestamp: new Date()
        }
    }).catch(err => console.error("[FinOps OpenAI Error]:", err));

    return response
}
