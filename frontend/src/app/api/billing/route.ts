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

    const [subscription, currentUsage, history] = await Promise.all([
      prisma.subscription.findUnique({
        where: { tenantId },
        include: { plan: true },
      }),
      prisma.apiCostEvent.aggregate({
        where: {
          tenantId,
          timestamp: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
        _sum: { costUsd: true, tokensInput: true, tokensOutput: true },
        _count: { _all: true },
      }),
      prisma.paymentEvent.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: { amount: true, currency: true, mercadopagoStatus: true, createdAt: true },
      }),
    ]);

    return NextResponse.json({
      tenantId,
      limits: {
        maxAgents: subscription?.plan.maxAgents ?? 1,
        maxUsers: subscription?.plan.maxUsers ?? 3,
        maxLeads: subscription?.plan.maxLeads ?? 100,
      },
      current: {
        estimatedCostUsd: currentUsage._sum.costUsd || 0,
        totalTokens: (currentUsage._sum.tokensInput || 0) + (currentUsage._sum.tokensOutput || 0),
        totalRequests: currentUsage._count._all,
        plan: subscription?.plan.name || "Starter",
      },
      history,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
