import { NextRequest, NextResponse } from "next/server";
import { OutreachService } from "@/lib/outreach/outreach-service";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id: campaignId } = await context.params;

    try {
        // Run orchestration in background
        OutreachService.processCampaign(campaignId);

        return NextResponse.json({
            message: "Campaign processing started in background.",
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
