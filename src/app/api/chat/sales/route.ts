import { NextResponse } from "next/server";
import { ratelimit } from "@/lib/ratelimit";
import { chatWithAgent } from "@/lib/agent-service/client";
import { cookies } from "next/headers";

export async function POST(req: Request) {
    try {
        // 1. Rate Limiting por IP
        const ip = req.headers.get("x-forwarded-for") || "anonymous";
        if (process.env.NODE_ENV === "production" && process.env.UPSTASH_REDIS_REST_URL) {
            const { success } = await ratelimit.limit(ip);
            if (!success) {
                return NextResponse.json(
                    { error: "Has alcanzado el límite de mensajes." },
                    { status: 429 }
                );
            }
        }

        const body = await req.json();
        const { messages, message } = body;

        // Soporte para ambos formatos
        const chatMessages = messages || [{ role: "user", content: message }];

        if (!chatMessages || chatMessages.length === 0) {
            return NextResponse.json(
                { error: "Messages are required" },
                { status: 400 }
            );
        }

        // 2. Gestionar Session ID vía Cookies
        const cookieStore = await cookies();
        let sessionId = cookieStore.get("_agt_sid")?.value;
        if (!sessionId) sessionId = crypto.randomUUID();

        const agentId = process.env.SALES_AGENT_ID;
        if (!agentId) {
            return NextResponse.json(
                { error: "SALES_AGENT_ID missing" },
                { status: 500 }
            );
        }

        // 3. Llamar al Agent Service
        const result = await chatWithAgent(agentId, chatMessages, sessionId);

        const response = NextResponse.json({
            response: result.response,
            threadId: result.session_id,
        });

        // Persistir sesión con la cookie
        response.headers.set(
            "Set-Cookie",
            `_agt_sid=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
        );

        return response;
    } catch (error: any) {
        console.error("Chat API Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
