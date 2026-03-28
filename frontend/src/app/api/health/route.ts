import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Redis } from "@upstash/redis"

const redis = Redis.fromEnv()

export async function GET() {

    const checks = {
        database: false,
        redis: false,
        openai: "skipped"
    }

    try {
        await prisma.$queryRaw`SELECT 1`
        checks.database = true
    } catch (e) {
        console.error("Health Check DB Error:", e)
    }

    try {
        await redis.ping()
        checks.redis = true
    } catch (e) {
        console.error("Health Check Redis Error:", e)
    }

    const healthy =
        checks.database &&
        checks.redis

    // Trigger WhatsApp Alert if unhealthy and not already alerted recently
    if (!healthy) {
        const { whatsapp } = await import("@/lib/whatsapp")
        const failedServices = Object.entries(checks)
            .filter(([name, status]) => name !== "openai" && !status)
            .map(([name]) => name.toUpperCase())
            .join(", ")

        // Cooldown check (using Redis to persist state across serverless invocations if needed, 
        // but for now simple in-memory or just log and send)
        try {
            const lastAlertKey = `health_alert_cooldown`
            const lastAlert = await redis.get(lastAlertKey)

            if (!lastAlert) {
                await whatsapp.sendAlert(`CRITICAL SYSTEM FAILURE: ${failedServices} is DOWN on VPS production.`)
                // Set cooldown for 1 hour
                await redis.set(lastAlertKey, "active", { ex: 3600 })
            }
        } catch (alertError) {
            console.error("Failed to trigger health alert:", alertError)
        }
    }

    return NextResponse.json({
        status: healthy ? "ok" : "degraded",
        checks,
        timestamp: new Date()
    })
}
