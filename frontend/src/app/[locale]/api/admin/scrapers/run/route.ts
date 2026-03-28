import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/request-auth";

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
    // Read secret at runtime (not cached at module level)
    const ADMIN_SECRET = process.env.ADMIN_SECRET || "";

    console.log("[SCRAPER_PROXY] Request received");
    console.log("[SCRAPER_PROXY] AGENT_SERVICE_URL:", AGENT_SERVICE_URL);
    console.log("[SCRAPER_PROXY] ADMIN_SECRET length:", ADMIN_SECRET.length);
    console.log("[SCRAPER_PROXY] ADMIN_SECRET preview:", ADMIN_SECRET.substring(0, 5) + "...");

    const auth = await requireAuth();
    if (!auth?.user) {
        console.log("[SCRAPER_PROXY] Auth failed - no session");
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const apiKey = (auth.user as any).apiKey;
    if (!apiKey) {
        console.error("[SCRAPER_PROXY] User has no API Key");
        return NextResponse.json({ error: "El usuario no tiene una API Key configurada" }, { status: 403 });
    }

    console.log("[SCRAPER_PROXY] Auth OK - userId:", auth.user.id);

    const body = await request.json();

    try {
        const targetUrl = `${AGENT_SERVICE_URL}/scraper/run`;
        console.log("[SCRAPER_PROXY] Forwarding to:", targetUrl);

        const res = await fetch(targetUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": apiKey,
            },
            body: JSON.stringify(body),
        });

        console.log("[SCRAPER_PROXY] VPS response status:", res.status);

        const data = await res.json();
        console.log("[SCRAPER_PROXY] VPS response body:", JSON.stringify(data));

        return NextResponse.json(data, { status: res.status });
    } catch (error: any) {
        console.error("[SCRAPER_PROXY] Error connecting to VPS:", error.message);
        return NextResponse.json(
            { error: "Error al conectar con el scraper: " + error.message },
            { status: 502 }
        );
    }
}
