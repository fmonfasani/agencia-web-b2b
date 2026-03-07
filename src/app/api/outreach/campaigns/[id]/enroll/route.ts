import { NextRequest, NextResponse } from "next/server";
import { OutreachService } from "@/lib/outreach/outreach-service";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id: campaignId } = await context.params;

    try {
        const body = await req.json();
        const { leadIds } = body;

        if (!leadIds || !Array.isArray(leadIds)) {
            return NextResponse.json({ error: "Invalid leadIds" }, { status: 400 });
        }

        const result = await OutreachService.enrollLeads(campaignId, leadIds);

        return NextResponse.json({
            message: `Successfully enrolled ${result.length} leads.`,
            enrolledCount: result.length,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
