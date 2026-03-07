import { NextRequest, NextResponse } from "next/server";
import { OutreachService } from "@/lib/outreach/outreach-service";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id: campaignId } = await context.params;

    try {
        const stats = await OutreachService.getCampaignStats(campaignId);
        return NextResponse.json(stats);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
