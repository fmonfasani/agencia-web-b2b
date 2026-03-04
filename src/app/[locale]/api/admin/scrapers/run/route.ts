import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/request-auth";

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || "http://localhost:8000";
const ADMIN_SECRET = process.env.AGENT_SERVICE_ADMIN_SECRET || "";

export async function POST(request: NextRequest) {
    const auth = await requireAuth();
    if (!auth) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();

    try {
        const res = await fetch(`${AGENT_SERVICE_URL}/scraper/run`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-admin-secret": ADMIN_SECRET,
            },
            body: JSON.stringify(body),
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error: any) {
        console.error("SCRAPER_RUN_PROXY_ERROR:", error);
        return NextResponse.json(
            { error: "Error al conectar con el scraper: " + error.message },
            { status: 502 }
        );
    }
}
