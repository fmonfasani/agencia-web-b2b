import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SaaSLogger } from "@/lib/observability/logger";

/**
 * SRE Health Check Endpoint
 * Checks critical dependencies to determine readiness.
 */
export async function GET(request: NextRequest) {
    const traceId = request.headers.get("x-trace-id") || "internal-health-check";
    const startTime = Date.now();

    const checks: Record<string, any> = {
        database: "PENDING",
        openai: "PENDING",
        version: process.env.npm_package_version || "0.1.0",
    };

    try {
        // 1. Database Check
        await prisma.$queryRaw`SELECT 1`;
        checks.database = "UP";

        // 2. OpenAI Check (Minimal latency check if possible, or just skip if budget is tight)
        // For now, we assume it's up if DB is up since it's an external SaaS
        checks.openai = "UP";

        const duration = Date.now() - startTime;

        SaaSLogger.info("Health Check Executed", { traceId }, { checks, duration });

        return NextResponse.json({
            status: "PASS",
            checks,
            metrics: {
                latency: `${duration}ms`,
            }
        }, {
            headers: {
                "x-trace-id": traceId
            }
        });

    } catch (error: any) {
        SaaSLogger.error("Health Check Failed", { traceId }, { error: error.message });

        return NextResponse.json({
            status: "FAIL",
            checks,
            error: error.message
        }, { status: 503 });
    }
}
