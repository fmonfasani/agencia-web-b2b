import { propagation, context } from '@opentelemetry/api';

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL!
const AGENT_API_KEY = process.env.AGENT_SERVICE_API_KEY!

interface Message {
    role: "user" | "assistant"
    content: string
}

interface ChatResponse {
    response: string
    session_id: string
}

export async function chatWithAgent(
    agentId: string,
    messages: Message[],
    sessionId: string,
): Promise<ChatResponse> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-api-key": AGENT_API_KEY,
    };

    // Inject OTEL context (traceparent) for distributed tracing
    propagation.inject(context.active(), headers);

    const res = await fetch(`${AGENT_SERVICE_URL}/api/agents/${agentId}/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ messages, session_id: sessionId }),
    })
    if (!res.ok) {
        const error = await res.text()
        throw new Error(`Agent service error ${res.status}: ${error}`)
    }
    return res.json()
}

// Admin helpers (llamar solo desde Server Actions o API routes protegidas)
export async function createAgent(data: {
    name: string
    systemPrompt: string
    description?: string
    tenantId?: string
    config?: any
}) {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-admin-secret": process.env.AGENT_ADMIN_SECRET!,
    };
    propagation.inject(context.active(), headers);

    const res = await fetch(`${AGENT_SERVICE_URL}/admin/agents/`, {
        method: "POST",
        headers,
        body: JSON.stringify({
            name: data.name,
            system_prompt: data.systemPrompt,
            description: data.description,
            tenant_id: data.tenantId,
            config: data.config || {},
        }),
    })
    return res.json()
}

export async function createApiKey(agentId: string, label: string) {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-admin-secret": process.env.AGENT_ADMIN_SECRET!,
    };
    propagation.inject(context.active(), headers);

    const res = await fetch(`${AGENT_SERVICE_URL}/admin/keys/`, {
        method: "POST",
        headers,
        body: JSON.stringify({ agent_id: agentId, label }),
    })
    return res.json()  // { api_key: "agk_xxx", label: "..." }
}
