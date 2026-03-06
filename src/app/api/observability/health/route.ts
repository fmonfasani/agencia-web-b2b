import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Redis } from "@upstash/redis";

export async function GET() {
    const health: any = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {}
    };

    // 1. Database Check
    try {
        await prisma.$queryRaw`SELECT 1`;
        health.services.database = { status: 'connected' };
    } catch (e) {
        health.status = 'degraded';
        health.services.database = { status: 'error', message: e instanceof Error ? e.message : 'Unknown error' };
    }

    // 2. Redis Check
    try {
        if (process.env.UPSTASH_REDIS_REST_URL) {
            const redis = Redis.fromEnv();
            await redis.ping();
            health.services.redis = { status: 'connected' };
        } else {
            health.services.redis = { status: 'skipped', message: 'Not configured' };
        }
    } catch (e) {
        health.status = 'degraded';
        health.services.redis = { status: 'error' };
    }

    // 3. Agent Service Check
    try {
        const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
        const res = await fetch(`${agentUrl}/health`, {
            cache: 'no-store',
            signal: AbortSignal.timeout(3000)
        });

        if (res.ok) {
            const data = await res.json();
            health.services.agentService = { status: 'connected', details: data };
        } else {
            health.services.agentService = { status: 'unhealthy', code: res.status };
        }
    } catch (e) {
        health.services.agentService = { status: 'unreachable' };
    }

    return NextResponse.json(health, {
        status: health.status === 'ok' ? 200 : 207 // 207 Multi-Status if degraded but alive
    });
}
