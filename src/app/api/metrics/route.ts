import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const membership = await prisma.membership.findFirst({
            where: { userId: user.id, status: "ACTIVE" },
            orderBy: { createdAt: "desc" },
        });

        if (!membership) {
            return NextResponse.json({ error: "No tenant found" }, { status: 403 });
        }

        const tenantId = membership.tenantId;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Run all queries in parallel for performance
        const [
            activeLeads,
            totalDeals,
            closedWonDeals,
            agentCount,
            userCount,
            customerCount,
            recentEvents,
        ] = await Promise.all([
            // Active leads count
            prisma.lead.count({
                where: { tenantId, status: { notIn: ["CONVERTED", "LOST", "DISQUALIFIED"] } },
            }),
            // All deals this month
            prisma.deal.findMany({
                where: { tenantId, createdAt: { gte: startOfMonth } },
                select: { stage: true, value: true, assignedToUserId: true, assignedToAgentId: true, closedAt: true, createdAt: true },
            }),
            // Deals closed won
            prisma.deal.findMany({
                where: { tenantId, stage: "CLOSED_WON", closedAt: { gte: startOfMonth } },
                select: { value: true, assignedToUserId: true, assignedToAgentId: true, createdAt: true, closedAt: true },
            }),
            // Active agents
            prisma.agent.count({ where: { tenantId, isActive: true } }),
            // Active memberships
            prisma.membership.count({ where: { tenantId, status: "ACTIVE" } }),
            // Customers MRR
            prisma.customer.findMany({
                where: { tenantId },
                select: { mrr: true },
            }),
            // Recent business events (last 10)
            prisma.businessEvent.findMany({
                where: { tenantId },
                orderBy: { createdAt: "desc" },
                take: 10,
                select: { type: true, createdAt: true, source: true },
            }),
        ]);

        // Calculate MRR from customers
        const totalMrr = customerCount.reduce(
            (sum: number, c: { mrr: { toString(): string } }) => sum + Number(c.mrr),
            0,
        );

        // Calculate conversion rate
        const conversionRate =
            totalDeals.length > 0
                ? Math.round((closedWonDeals.length / totalDeals.length) * 100)
                : 0;

        // MRR from closed deals this month (deals value sum)
        const mrrFromDeals = closedWonDeals.reduce(
            (sum: number, d: { value?: { toString(): string } | null }) => sum + Number(d.value || 0),
            0,
        );

        // Deals by channel: human vs agent
        const dealsByHuman = totalDeals.filter((d) => d.assignedToUserId).length;
        const dealsByAgent = totalDeals.filter((d) => d.assignedToAgentId).length;

        // Average time to close (in days)
        const closedWithDates = closedWonDeals.filter((d) => d.closedAt);
        const avgDaysToClose =
            closedWithDates.length > 0
                ? Math.round(
                    closedWithDates.reduce((sum: number, d) => {
                        return (
                            sum +
                            (d.closedAt!.getTime() - d.createdAt.getTime()) /
                            (1000 * 60 * 60 * 24)
                        );
                    }, 0) / closedWithDates.length,
                )
                : 0;

        return NextResponse.json({
            activeLeads,
            totalDeals: totalDeals.length,
            closedWonDeals: closedWonDeals.length,
            conversionRate,
            mrrFromDeals,
            totalMrr,
            agentCount,
            userCount,
            customerCount: customerCount.length,
            dealsByHuman,
            dealsByAgent,
            avgDaysToClose,
            recentEvents,
        });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Server Error";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
