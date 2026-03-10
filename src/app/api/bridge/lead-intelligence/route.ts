import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/tenant-context";

/**
 * BRIDGE ENDPOINT: Lead Intelligence Bypass
 * 
 * This endpoint allows the VPS to push processed lead data indirectly to the Vercel DB,
 * bypassing the blocked port 5432.
 * 
 * SECURITY: Requires a Bearer token matching INTERNAL_API_SECRET.
 */
export async function POST(request: NextRequest) {
    const authHeader = request.headers.get("Authorization");
    const secret = process.env.INTERNAL_API_SECRET;

    if (!secret) {
        console.error("❌ INTERNAL_API_SECRET is not configured on Vercel.");
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    if (authHeader !== `Bearer ${secret}`) {
        console.warn("⚠️ Unauthorized bridge access attempt from:", request.headers.get("x-forwarded-for"));
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { leadId, strategicBrief, marketAnalysis, interviewGuide, nicheAnalysis, score } = body;

        if (!leadId) {
            return NextResponse.json({ error: "Missing leadId" }, { status: 400 });
        }

        // Use a default tenant context if none provided (system-level bridge)
        // In this app, we typically use the tenantId from the lead or a master tenant
        const tenantId = body.tenantId || "default-vps-bridge";
        const tPrisma = getTenantPrisma(tenantId);

        const result = await tPrisma.leadIntelligence.upsert({
            where: { leadId },
            update: {
                strategicBrief,
                marketAnalysis,
                interviewGuide,
                nicheAnalysis,
                updatedAt: new Date(),
            },
            create: {
                leadId,
                strategicBrief,
                marketAnalysis,
                interviewGuide,
                nicheAnalysis,
            },
        });

        console.log(`✅ Bridge: Updated intelligence for lead ${leadId}`);
        return NextResponse.json({ success: true, data: result });
    } catch (err) {
        console.error("❌ Bridge Error:", err);
        const msg = err instanceof Error ? err.message : "Internal error";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
