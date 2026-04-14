import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const memberships = await prisma.membership.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      select: { tenantId: true },
    });

    const tenantId = request.nextUrl.searchParams.get("tenantId") || memberships[0]?.tenantId;
    if (!tenantId || !memberships.some((m) => m.tenantId === tenantId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [agentUsage, costSummary, billingHistory] = await Promise.all([
      prisma.agent_request_traces.groupBy({
        by: ["finish_reason"],
        where: { tenant_id: tenantId },
        _count: { _all: true },
        _sum: { tokens_used: true, total_ms: true },
      }),
      prisma.apiCostEvent.aggregate({
        where: {
          tenantId,
          timestamp: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
        _sum: { costUsd: true, tokensInput: true, tokensOutput: true },
      }),
      prisma.apiCostEvent.findMany({
        where: { tenantId },
        orderBy: { timestamp: "desc" },
        take: 20,
        select: { api: true, endpoint: true, costUsd: true, timestamp: true },
      }),
    ]);

    return NextResponse.json({
      tenantId,
      byAgent: agentUsage.map((row) => ({
        agent: row.finish_reason || "unknown",
        executions: row._count._all,
        tokens: row._sum.tokens_used || 0,
        avgLatencyMs: row._count._all ? Math.round((row._sum.total_ms || 0) / row._count._all) : 0,
      })),
      monthly: {
        costUsd: costSummary._sum.costUsd || 0,
        tokens: (costSummary._sum.tokensInput || 0) + (costSummary._sum.tokensOutput || 0),
      },
      history: billingHistory,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
