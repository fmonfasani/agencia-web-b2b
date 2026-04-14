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
    if (!memberships.length) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const membershipTenantIds = memberships.map((m) => m.tenantId);
    const tenantId = request.nextUrl.searchParams.get("tenantId") || membershipTenantIds[0];
    if (!membershipTenantIds.includes(tenantId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [
      totalTenants,
      totalExecutions,
      totalTokens,
      totalRevenue,
      topTenants,
      topAgents,
      tenantExecutions,
      tenantSuccess,
      tenantCost,
      tenantQuota,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.agent_request_traces.count(),
      prisma.agent_request_traces.aggregate({ _sum: { tokens_used: true } }),
      prisma.paymentEvent.aggregate({ _sum: { amount: true } }),
      prisma.agent_request_traces.groupBy({
        by: ["tenant_id"],
        _count: { _all: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
      prisma.agent_request_traces.groupBy({
        by: ["finish_reason"],
        _count: { _all: true },
        where: { tenant_id: tenantId },
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.agent_request_traces.count({ where: { tenant_id: tenantId } }),
      prisma.agent_request_traces.groupBy({
        by: ["success"],
        _count: { _all: true },
        where: { tenant_id: tenantId },
      }),
      prisma.apiCostEvent.aggregate({
        where: { tenantId },
        _sum: { costUsd: true },
      }),
      prisma.plan.findMany({
        where: { subscriptions: { some: { tenantId } } },
        take: 1,
      }),
    ]);

    const topTenantRows = await Promise.all(
      topTenants.map(async (row) => {
        const tenant = await prisma.tenant.findUnique({ where: { id: row.tenant_id }, select: { name: true } });
        return { tenantId: row.tenant_id, name: tenant?.name ?? row.tenant_id, executions: row._count._all };
      }),
    );

    const successCount = tenantSuccess.find((row) => row.success === true)?._count._all || 0;
    const errorCount = tenantSuccess.find((row) => row.success === false)?._count._all || 0;

    return NextResponse.json({
      global: {
        totalTenants,
        totalExecutions,
        totalTokens: totalTokens._sum.tokens_used || 0,
        totalRevenue: totalRevenue._sum.amount || 0,
        topTenants: topTenantRows,
        topAgents: topAgents.map((row) => ({ label: row.finish_reason || "unknown", total: row._count._all })),
      },
      tenant: {
        tenantId,
        executions: tenantExecutions,
        successRate: tenantExecutions ? Math.round((successCount / tenantExecutions) * 100) : 0,
        errorRate: tenantExecutions ? Math.round((errorCount / tenantExecutions) * 100) : 0,
        monthlyCostUsd: tenantCost._sum.costUsd || 0,
        quota: {
          usedExecutions: tenantExecutions,
          limitExecutions: topTenants.length ? (tenantQuota[0]?.maxAgents || 1) * 1000 : 1000,
        },
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
