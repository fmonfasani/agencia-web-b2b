import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saasClientFor } from "@/lib/saas-client";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = (session.user as any)?.apiKey as string | undefined;
  if (!apiKey) {
    return NextResponse.json({ error: "No API key" }, { status: 401 });
  }

  try {
    const client = saasClientFor(apiKey);
    const raw = await client.agent.traces();

    // Map AgentTrace[] → component Trace shape
    const traces = raw.map((t) => ({
      id: t.id,
      traceId: t.id,
      service: "agent",
      operation: (t.query ?? "query").slice(0, 60),
      duration: t.total_duration_ms ?? 0,
      status: t.success === false ? "error" : "ok",
      createdAt: t.created_at,
    }));

    return NextResponse.json({ success: true, traces });
  } catch {
    return NextResponse.json({ success: true, traces: [] });
  }
}
