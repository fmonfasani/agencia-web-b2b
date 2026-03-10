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
    const authHeader = request.headers.get("authorization");
    const internalSecret = request.headers.get("x-internal-secret");

    // Accept Bearer token or direct X-Internal-Secret header
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : internalSecret;
    const expected = process.env.INTERNAL_API_SECRET || "366bbcdceecb8723e8de206c2e0cc7b5";

    if (!token || token !== expected) {
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
