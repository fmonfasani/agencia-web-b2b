import { NextRequest, NextResponse } from "next/server";
import { BridgeClient } from "@/lib/bridge-client";

/**
 * Internal endpoint for agent-service to report business metrics and failures.
 * Protected by X-Internal-Secret.
 */
export async function POST(req: NextRequest) {
    const authHeader = req.headers.get("authorization");
    const internalSecretHeader = req.headers.get("x-internal-secret");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : internalSecretHeader;

    const expected = process.env.INTERNAL_API_SECRET || "366bbcdceecb8723e8de206c2e0cc7b5";

    if (!token || token !== expected) {
        console.error(`[METRIC_AUTH_FAILURE] Secret mismatch.`);
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { tenantId, type, status, value, metadata } = body;

        if (!tenantId || !type || !status) {
            return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const metric = await BridgeClient.query("businessMetric", "create", {
            data: {
                tenantId,
                type,
                status,
                value,
                metadata: metadata || {}
            }
        });

        return NextResponse.json({ success: true, id: metric.id });
    } catch (error: any) {
        console.error("[METRIC_LOG_API_ERROR]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
