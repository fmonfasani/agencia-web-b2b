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
    const stats = await client.admin.stats();
    const now = new Date().toISOString();

    // Derive synthetic Metric records from admin stats
    const metrics = [
      {
        id: "m_tenants",
        name: "total_tenants",
        value: stats.total_tenants,
        tags: {},
        createdAt: now,
      },
      {
        id: "m_users",
        name: "total_active_users",
        value: stats.total_active_users,
        tags: {},
        createdAt: now,
      },
      {
        id: "m_queries_today",
        name: "queries_today",
        value: stats.queries_today,
        tags: { window: "today" },
        createdAt: now,
      },
      {
        id: "m_queries_7d",
        name: "queries_7d",
        value: stats.queries_7d,
        tags: { window: "7d" },
        createdAt: now,
      },
      {
        id: "m_errors_7d",
        name: "errors_7d",
        value: stats.errors_7d,
        tags: { window: "7d" },
        createdAt: now,
      },
    ];

    return NextResponse.json({ success: true, metrics });
  } catch {
    return NextResponse.json({ success: true, metrics: [] });
  }
}
