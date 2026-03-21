import { NextResponse } from "next/server";
import { FinOpsIntelligence } from "@/lib/observability/finops/FinOpsIntelligence";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const [anomalies, cpl, industryRoi] = await Promise.all([
            FinOpsIntelligence.detectAnomalies(),
            FinOpsIntelligence.getCostPerLead(30),
            FinOpsIntelligence.getIndustryROI(30)
        ]);

        const totalCostSum = await prisma.apiCostEvent.aggregate({
            where: {
                timestamp: {
                    gte: new Date(new Date().setDate(new Date().getDate() - 30))
                }
            },
            _sum: { costUsd: true }
        });

        const costByProviderRaw = await prisma.apiCostEvent.groupBy({
            by: ['api'],
            where: {
                timestamp: {
                    gte: new Date(new Date().setDate(new Date().getDate() - 30))
                }
            },
            _sum: { costUsd: true }
        });

        const costByProvider: Record<string, number> = {};
        costByProviderRaw.forEach((item: { api: string; _sum: { costUsd: number | null } }) => {
            costByProvider[item.api] = item._sum.costUsd || 0;
        });

        return NextResponse.json({
            period: "30d",
            totalCost: totalCostSum._sum.costUsd || 0,
            costByProvider,
            costPerLead: cpl,
            industryRoi,
            anomalies,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
