import { prisma } from "@/lib/prisma";

export interface HeatmapDataPoint {
    location: string;
    industry: string;
    apiProvider: string;
    successRate: number;
    avgLatencyMs: number;
    errorCount: number;
    period: string;
}

export class PerformanceAnalytics {
    /**
     * Aggregates OperationEvent data to generate heatmap points.
     * Simulates a materialized view for analytical efficiency.
     */
    static async getHeatmapData(days: number = 7): Promise<HeatmapDataPoint[]> {
        const since = new Date();
        since.setDate(since.getDate() - days);

        // We use Prisma's groupBy to aggregate events.
        // In a high-scale production environment, this would query a materialized view or an OLAP store.
        const aggregations = await prisma.operationEvent.groupBy({
            by: ['location', 'industry', 'provider'],
            where: {
                createdAt: {
                    gte: since
                }
            },
            _avg: {
                latencyMs: true
            },
            _count: {
                _all: true,
                success: true // Note: Prisma counts all records with a value for success, not just true.
            },
        });

        // We need an additional pass to count specifically SUCCESSFUL events because groupBy doesn't natively handle conditional sums in one go.
        // However, we can also count failures if errorCode is not null, or we can fetch successes in parallel.

        // Let's refine the approach: get total count and success count.
        // Since OperationEvent is an event log, we'll map the results.

        const heatmapPoints: HeatmapDataPoint[] = await Promise.all(aggregations.map(async (group) => {
            const successCount = await prisma.operationEvent.count({
                where: {
                    location: group.location,
                    industry: group.industry,
                    provider: group.provider,
                    success: true,
                    createdAt: { gte: since }
                }
            });

            const totalCount = group._count._all;
            const successRate = totalCount > 0 ? successCount / totalCount : 0;

            return {
                location: group.location || "Global",
                industry: group.industry || "General",
                apiProvider: group.provider,
                successRate: successRate,
                avgLatencyMs: group._avg.latencyMs || 0,
                errorCount: totalCount - successCount,
                period: `${days}d`
            };
        }));

        return heatmapPoints;
    }

    /**
     * Records a new operational event.
     */
    static async logOperation(data: {
        location?: string;
        industry?: string;
        provider: string;
        operation: string;
        success: boolean;
        latencyMs: number;
        errorCode?: string;
    }) {
        return prisma.operationEvent.create({
            data
        });
    }
}
