import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { requireInternalSecret } from "@/lib/api-auth";

/**
 * BRIDGE ENDPOINT: Lead Intelligence Bypass
 *
 * This endpoint allows the VPS to push processed lead data indirectly to the Vercel DB,
 * bypassing the blocked port 5432.
 *
 * SECURITY: Requires a Bearer token or X-Internal-Secret matching INTERNAL_API_SECRET.
 */
export async function POST(request: NextRequest) {
  try {
    requireInternalSecret(request);
  } catch (err: unknown) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      leadId,
      strategicBrief,
      marketAnalysis,
      interviewGuide,
      nicheAnalysis,
    } = body;

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
