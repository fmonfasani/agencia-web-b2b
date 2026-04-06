import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
    try {
        const { events } = await req.json();

        if (!events || !Array.isArray(events)) {
            return NextResponse.json({ error: 'Invalid events' }, { status: 400 });
        }

        // Log RUM events for monitoring (skip Prisma in dev without DB)
        logger.debug('[RUM] Events received', {
            count: events.length,
            sample: events[0],
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('RUM: Failed to process events', {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
