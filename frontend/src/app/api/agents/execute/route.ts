import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { tenantId, query } = await request.json();
    if (!tenantId || !query) {
      return NextResponse.json({ error: "tenantId and query are required" }, { status: 400 });
    }

    const apiKey = (user as any).apiKey;
    if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 403 });

    const baseUrl = process.env.NEXT_PUBLIC_AGENTS_API_URL || "http://localhost:8001";
    const response = await fetch(`${baseUrl}/agent/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({ tenant_id: tenantId, query }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return NextResponse.json({ error: errorBody || "Execution failed" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
