import { prisma } from '@/lib/prisma';

export type MetricType = 'EXTRACTION_SUCCESS' | 'EXTRACTION_LATENCY' | 'SCRAPER_AVAILABILITY';
export type MetricStatus = 'SUCCESS' | 'FAILURE';

/**
 * Logs a high-level Business Metric (SLI) to the database.
 * Used for tracking system reliability and automation success rates.
 */
export async function logBusinessMetric({
    tenantId,
    type,
    status,
    value,
    metadata
}: {
    tenantId: string;
    type: MetricType;
    status: MetricStatus;
    value?: number;
    metadata?: any;
}) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma as any).businessMetric.create({
            data: {
                tenantId,
                type,
                status,
                value,
                metadata: metadata || {}
            }
        });
    } catch (error) {
        console.error(`[SRE_METRICS_ERROR] Failed to log metric ${type}:`, error);
    }
}

/**
 * Helper to record a timed operation and log its latency.
 */
export async function withMetricTimer<T>(
    tenantId: string,
    type: MetricType,
    operation: () => Promise<T>
): Promise<T> {
    const start = performance.now();
    try {
        const result = await operation();
        const duration = (performance.now() - start) / 1000; // duration in seconds

        await logBusinessMetric({
            tenantId,
            type: 'EXTRACTION_LATENCY',
            status: 'SUCCESS',
            value: duration,
            metadata: { operation: type }
        });

        await logBusinessMetric({
            tenantId,
            type: 'EXTRACTION_SUCCESS',
            status: 'SUCCESS',
            metadata: { operation: type }
        });

        return result;
    } catch (error) {
        await logBusinessMetric({
            tenantId,
            type: 'EXTRACTION_SUCCESS',
            status: 'FAILURE',
            metadata: { operation: type, error: String(error) }
        });
        throw error;
    }
}
