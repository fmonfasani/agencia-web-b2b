import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { events } = await req.json();

        if (!events || !Array.isArray(events)) {
            return NextResponse.json({ error: 'Invalid events' }, { status: 400 });
        }

        // Bulk insert events for performance
        await prisma.rumEvent.createMany({
            data: events.map((e: any) => ({
                sessionId: e.sessionId,
                userId: e.userId,
                page: e.page,
                metric: e.metric,
                value: e.value,
                userAgent: e.userAgent,
            })),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('RUM: Failed to store events', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
