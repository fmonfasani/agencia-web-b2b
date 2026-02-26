import OpenAI from "openai";
import { NextResponse } from "next/server";
import { salesChatRateLimit } from "@/lib/ratelimit";
import { getSessionUser } from "@/lib/auth";

// Forzamos que la ruta sea dinámica para evitar errores durante el build
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const openai = new OpenAI({
        apiKey: process.env.OPEN_IA_API_KEY || process.env.OPENAI_API_KEY,
    });

    const ASSISTANT_ID = process.env.ASSISTANT_ID!;

    try {
        // 1. Rate Limit con Upstash (Opcional en local)
        if (
            process.env.UPSTASH_REDIS_REST_URL &&
            process.env.UPSTASH_REDIS_REST_TOKEN
        ) {
            const ip = req.headers.get("x-forwarded-for") || "anonymous";
            const { success, limit, reset, remaining } =
                await salesChatRateLimit.limit(ip);

            if (!success) {
                return NextResponse.json(
                    {
                        error:
                            "Has alcanzado el límite de mensajes. Inténtalo de nuevo en unos minutos.",
                    },
                    {
                        status: 429,
                        headers: {
                            "X-RateLimit-Limit": limit.toString(),
                            "X-RateLimit-Remaining": remaining.toString(),
                            "X-RateLimit-Reset": reset.toString(),
                        },
                    },
                );
            }
        }

        const { message, threadId: existingThreadId } = await req.json();

        if (!message)
            return NextResponse.json(
                { error: "Message is required" },
                { status: 400 },
            );
        if (!process.env.ASSISTANT_ID)
            return NextResponse.json(
                { error: "ASSISTANT_ID missing" },
                { status: 500 },
            );

        // 2. Verificar si el usuario está logueado
        const user = await getSessionUser();
        const isLogged = !!user;

        // 3. Thread
        const threadId =
            existingThreadId && existingThreadId !== "undefined"
                ? existingThreadId
                : (await openai.beta.threads.create()).id;

        // 4. Message con contexto adicional si NO está logueado
        let promptContent = message;
        if (!isLogged) {
            promptContent = `[CONTEXTO: El usuario NO está logueado. Recuerda persuadirlo para que se registre gratis en /es/auth/sign-up] ${message}`;
        }

        await openai.beta.threads.messages.create(threadId, {
            role: "user",
            content: promptContent,
        });

        // 5. Run & Wait
        const run = await openai.beta.threads.runs.createAndPoll(threadId, {
            assistant_id: ASSISTANT_ID,
        });

        if (run.status === "completed") {
            const messages = await openai.beta.threads.messages.list(threadId);
            const lastMessage = messages.data.find((m) => m.role === "assistant");

            const responseText =
                lastMessage?.content[0]?.type === "text"
                    ? lastMessage.content[0].text.value
                    : "No pude obtener respuesta.";

            return NextResponse.json({ response: responseText, threadId });
        } else {
            return NextResponse.json(
                { error: `Run status: ${run.status}` },
                { status: 500 },
            );
        }
    } catch (error: unknown) {
        console.error("Chat API Error:", error);
        const errorMessage =
            error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
