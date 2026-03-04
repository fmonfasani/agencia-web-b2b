import { NextResponse } from "next/server";
import { salesChatRateLimit } from "@/lib/ratelimit";
import { chatWithAgent } from "@/lib/agent-service/client";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        // 1. Rate Limit
        if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
            const ip = req.headers.get("x-forwarded-for") || "anonymous";
            const { success, limit, reset, remaining } = await salesChatRateLimit.limit(ip);
            if (!success) {
                return NextResponse.json(
                    { error: "Has alcanzado el límite de mensajes." },
                    { status: 429 }
                );
            }
        }

        const { messages, message } = await req.json();

        // Soporte para ambos formatos (array de mensajes o mensaje único)
        const chatMessages = messages || [{ role: "user", content: message }];

        if (!chatMessages || chatMessages.length === 0) {
            return NextResponse.json({ error: "Messages are required" }, { status: 400 });
        }

        // 2. Gestionar Session ID vía Cookies
        const cookieStore = await cookies();
        let sessionId = cookieStore.get("_agt_sid")?.value;
        if (!sessionId) sessionId = crypto.randomUUID();

        const agentId = process.env.SALES_AGENT_ID;
        if (!agentId) {
            return NextResponse.json({ error: "SALES_AGENT_ID missing" }, { status: 500 });
        }

        // 3. Llamar al Agent Service
        const result = await chatWithAgent(agentId, chatMessages, sessionId);

        const response = NextResponse.json({
            response: result.response,
            threadId: result.session_id
        });

        // Persistir sesión
        response.headers.set("Set-Cookie",
            `_agt_sid=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
        );

        return response;

    } catch (error: any) {
        console.error("Chat API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
