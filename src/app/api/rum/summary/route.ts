import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const symbols = await prisma.rumEvent.groupBy({
            by: ['page', 'metric'],
            _count: {
                _all: true,
            },
            where: {
                createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24h
                },
            },
        });

        // Helper to calculate percentiles (simplified for small datasets)
        // In a real high-traffic app, we'd use a timeseries DB or pre-aggregated tables
        const summary = await Promise.all(symbols.map(async (s: any) => {
            const data = await prisma.rumEvent.findMany({
                where: {
                    page: s.page as string,
                    metric: s.metric as string,
                    createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    },
                },
                select: {
                    value: true,
                },
                orderBy: {
                    value: 'asc',
                },
            });

            const values = data.map((d: any) => d.value as number);
            const getPercentile = (p: number) => {
                const idx = Math.floor((p / 100) * values.length);
                return values[idx] || 0;
            };

            return {
                page: s.page,
                metric: s.metric,
                count: values.length,
                p50: getPercentile(50),
                p75: getPercentile(75),
                p95: getPercentile(95),
            };
        }));

        return NextResponse.json(summary);
    } catch (error) {
        console.error('RUM: Failed to get summary', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
