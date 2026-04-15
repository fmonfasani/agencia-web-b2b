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
    const data = await client.health();

    // Map backend-saas HealthResponse → component HealthStatus shape
    return NextResponse.json({
      status: data.status,
      timestamp: data.timestamp,
      services: {
        database: data.services.postgres ?? { status: "skipped" },
        redis: { status: "skipped", message: "Not configured" },
        agentService: data.services.ollama ??
          data.services.qdrant ?? { status: "connected" },
      },
    });
  } catch {
    return NextResponse.json({
      status: "degraded",
      timestamp: new Date().toISOString(),
      services: {
        database: { status: "unreachable" },
        redis: { status: "skipped" },
        agentService: { status: "unreachable" },
      },
    });
  }
}
