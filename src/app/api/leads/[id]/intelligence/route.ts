import { NextRequest, NextResponse } from "next/server";
import { LeadIntelligenceService } from "@/lib/leads/intelligence-service";
import { prisma } from "@/lib/prisma";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const intelligence = await prisma.leadIntelligence.findUnique({
            where: { leadId: id },
        });

        if (!intelligence) {
            return NextResponse.json({ message: "No intelligence data found." }, { status: 404 });
        }

        return NextResponse.json(intelligence);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const result = await LeadIntelligenceService.analyzeLead(id);
        return NextResponse.json({
            message: "Lead analysis completed successfully.",
            data: result,
        });
    } catch (error: any) {
        console.error(`[API Intelligence] Error analyzing lead ${id}:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
