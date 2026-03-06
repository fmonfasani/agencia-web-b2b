import { prisma } from '@/lib/prisma';
import { MetricEvent } from './types';

/**
 * Records a metric event in the database for business analysis and observability dashboards.
 */
export const recordMetric = async (event: MetricEvent) => {
    try {
        // We use a separate catch to avoid failing the main request if observability fails
        return await prisma.metric.create({
            data: {
                name: event.name,
                value: event.value,
                tags: event.tags || {},
                createdAt: new Date(event.timestamp),
            },
        });
    } catch (error) {
        console.error('[Observability:Metrics] Failed to record metric:', error);
    }
};

/**
 * Convenience method to increment a counter.
 */
export const incrementCounter = (name: string, tags?: Record<string, string>) => {
    return recordMetric({
        name,
        value: 1,
        timestamp: Date.now(),
        tags,
    });
};

/**
 * Convenience method to record latency or a gauge value.
 */
export const recordValue = (name: string, value: number, tags?: Record<string, string>) => {
    return recordMetric({
        name,
        value,
        timestamp: Date.now(),
        tags,
    });
};
