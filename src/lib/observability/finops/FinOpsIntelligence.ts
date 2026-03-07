import { prisma } from "@/lib/prisma";

export class FinOpsIntelligence {
    /**
     * Detects cost anomalies by comparing current spending vs daily average.
     * Flagging if > 35% deviation.
     */
    static async detectAnomalies() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const logs = await prisma.apiCostEvent.findMany({
            where: { timestamp: { gte: thirtyDaysAgo } },
            orderBy: { timestamp: 'desc' },
        });

        if (logs.length < 5) return [];

        const dailyCosts: Record<string, number> = {};
        logs.forEach((log) => {
            const day = log.timestamp.toISOString().split('T')[0];
            dailyCosts[day] = (dailyCosts[day] || 0) + (log.costUsd || 0);
        });

        const values = Object.values(dailyCosts);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const today = new Date().toISOString().split('T')[0];
        const todayCost = dailyCosts[today] || 0;

        const anomalies = [];
        if (todayCost > avg * 1.35) {
            anomalies.push({
                type: 'COST_SPIKE',
                severity: 'HIGH',
                message: `Gasto de hoy ($${todayCost.toFixed(2)}) supera el promedio ($${avg.toFixed(2)}) en más de un 35%`,
                detectedAt: new Date().toISOString(),
            });
        }

        return anomalies;
    }

    /**
     * Calculates Cost Per Lead (CPL) for the given timeframe.
     */
    static async getCostPerLead(days: number = 30) {
        const gte = new Date();
        gte.setDate(gte.getDate() - days);

        const totalCost = await prisma.apiCostEvent.aggregate({
            where: { timestamp: { gte } },
            _sum: { costUsd: true },
        });

        const totalLeads = await prisma.lead.count({
            where: { createdAt: { gte } },
        });

        if (totalLeads === 0) return 0;
        return (totalCost._sum.costUsd || 0) / totalLeads;
    }

    /**
     * Estimates ROI per Industry based on custom weights or hypothetical conversion values.
     */
    static async getIndustryROI(days: number = 30) {
        const gte = new Date();
        gte.setDate(gte.getDate() - days);

        const eventsByIndustry = await prisma.operationEvent.groupBy({
            by: ['industry'],
            where: { createdAt: { gte } },
            _count: { _all: true },
        });

        // Dummy logic for ROI calculation (mock values per industry)
        const roiMap: Record<string, number> = {
            'Software': 4.5,
            'Legal': 3.2,
            'Real Estate': 5.8,
            'Health': 2.9,
        };

        return eventsByIndustry.map((group) => ({
            industry: group.industry || 'Unknown',
            leads: group._count?._all || 0, // In this context, these are operation events
            roi: roiMap[group.industry || ''] || 2.5,
        }));
    }
}
