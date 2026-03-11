import { NextRequest, NextResponse } from "next/server";
import { BridgeClient } from "@/lib/bridge-client";
import { requireInternalSecret } from "@/lib/api-auth";

/**
 * Internal endpoint for agent-service to report business metrics and failures.
 * Protected by X-Internal-Secret.
 */
export async function POST(req: NextRequest) {
  try {
    requireInternalSecret(req);
  } catch (err: unknown) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { tenantId, type, status, value, metadata } = body;

    if (!tenantId || !type || !status) {
      return NextResponse.json(
        { error: "Campos requeridos faltantes" },
        { status: 400 },
      );
    }

    const metric = await BridgeClient.query("businessMetric", "create", {
      data: {
        tenantId,
        type,
        status,
        value,
        metadata: metadata || {},
      },
    });

    return NextResponse.json({ success: true, id: metric.id });
  } catch (error: unknown) {
    console.error("[METRIC_LOG_API_ERROR]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 },
    );
  }
}
