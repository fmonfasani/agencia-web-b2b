import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// import { auth } from '@/auth'; // Assuming auth is needed later

export async function GET() {
    // TODO: Add Admin Authorization check here

    try {
        const traces = await prisma.trace.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        return NextResponse.json({
            success: true,
            traces
        });
    } catch (error) {
        console.error('[Observability:Traces] GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch traces' }, { status: 500 });
    }
}
