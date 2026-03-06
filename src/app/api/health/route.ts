import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Redis } from "@upstash/redis"
import OpenAI from "openai"

const redis = Redis.fromEnv()

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

export async function GET() {

    const checks = {
        database: false,
        redis: false,
        openai: false
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

    try {
        await openai.models.list()
        checks.openai = true
    } catch (e) {
        console.error("Health Check OpenAI Error:", e)
    }

    const healthy =
        checks.database &&
        checks.redis &&
        checks.openai

    return NextResponse.json({
        status: healthy ? "ok" : "degraded",
        checks,
        timestamp: new Date()
    })
}
