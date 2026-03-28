import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/request-auth";

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || "http://localhost:8000";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    const ADMIN_SECRET = process.env.ADMIN_SECRET || "";
    const auth = await requireAuth();
    if (!auth) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { jobId } = await params;

    try {
        const res = await fetch(`${AGENT_SERVICE_URL}/scraper/status/${jobId}`, {
            headers: { "x-admin-secret": ADMIN_SECRET },
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error: any) {
        console.error("SCRAPER_STATUS_PROXY_ERROR:", error);
        return NextResponse.json(
            { error: "Error al obtener estado del scraper" },
            { status: 502 }
        );
    }
}
