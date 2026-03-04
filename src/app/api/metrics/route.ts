import { NextResponse } from "next/server";
import { prisma, getTenantPrisma } from "@/lib/prisma";
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
        const tPrisma = getTenantPrisma(tenantId);
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Run all queries in parallel for performance
        const [
            activeLeads,
            totalDeals,
            closedWonDeals,
            agentCount,
            userCount,
            customerData,
            recentEvents,
            revenueHistory,
        ] = await Promise.all([
            // Active leads count
            tPrisma.lead.count({
                where: { status: { notIn: ["CONVERTED", "LOST", "DISQUALIFIED"] } },
            }),
            // All deals this month
            tPrisma.deal.findMany({
                where: { createdAt: { gte: startOfMonth } },
                select: { stage: true, value: true, assignedToUserId: true, assignedToAgentId: true, closedAt: true, createdAt: true },
            }),
            // Deals closed won
            tPrisma.deal.findMany({
                where: { stage: "CLOSED_WON", closedAt: { gte: startOfMonth } },
                select: { value: true, assignedToUserId: true, assignedToAgentId: true, createdAt: true, closedAt: true },
            }),
            // Active agents
            tPrisma.agent.count({ where: { active: true } }),
            // Active memberships
            tPrisma.membership.count({ where: { status: "ACTIVE" } }),
            // Customers MRR
            tPrisma.customer.findMany({
                select: { mrr: true },
            }),
            // Recent business events (last 10)
            tPrisma.businessEvent.findMany({
                orderBy: { createdAt: "desc" },
                take: 10,
                select: { type: true, createdAt: true, source: true },
            }),
            // Revenue history (last 30 days)
            tPrisma.userDailyMetrics.findMany({
                where: { date: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
                orderBy: { date: "asc" },
                select: { date: true, revenueGenerated: true },
            }),
        ]);

        // Aggregate revenue history by date
        const revenueByDate = revenueHistory.reduce((acc: Record<string, number>, curr) => {
            const dateStr = curr.date.toISOString().split("T")[0];
            acc[dateStr] = (acc[dateStr] || 0) + Number(curr.revenueGenerated);
            return acc;
        }, {});

        const formattedHistory = Object.entries(revenueByDate).map(([date, revenue]) => ({
            date,
            revenue,
        }));

        // Calculate MRR from customers
        const totalMrr = customerData.reduce(
            (sum: number, c: any) => sum + Number(c.mrr),
            0,
        );

        // Calculate conversion rate
        const conversionRate =
            totalDeals.length > 0
                ? Math.round((closedWonDeals.length / totalDeals.length) * 100)
                : 0;

        // MRR from closed deals this month (deals value sum)
        const mrrFromDeals = closedWonDeals.reduce(
            (sum: number, d: any) => sum + Number(d.value || 0),
            0,
        );

        // Deals by channel: human vs agent
        const dealsByHuman = totalDeals.filter((d: any) => d.assignedToUserId).length;
        const dealsByAgent = totalDeals.filter((d: any) => d.assignedToAgentId).length;

        // Average time to close (in days)
        const closedWithDates = closedWonDeals.filter((d: any) => d.closedAt);
        const avgDaysToClose =
            closedWithDates.length > 0
                ? Math.round(
                    closedWithDates.reduce((sum: number, d: any) => {
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
            customerCount: customerData.length,
            dealsByHuman,
            dealsByAgent,
            avgDaysToClose,
            recentEvents,
            revenueHistory: formattedHistory,
        });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Server Error";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
