import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saasClientFor } from "@/lib/saas-client";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey =
    (session.user as any)?.apiKey || (session as any)?.backendApiKey;
  if (!apiKey) {
    return NextResponse.json({ error: "No API key" }, { status: 401 });
  }

  const client = saasClientFor(apiKey);
  const [metricsResult, qdrantResult] = await Promise.allSettled([
    client.training.getMetrics(),
    client.training.getQdrantStats(),
  ]);

  return NextResponse.json({
    metrics: metricsResult.status === "fulfilled" ? metricsResult.value : null,
    qdrant: qdrantResult.status === "fulfilled" ? qdrantResult.value : null,
  });
}
