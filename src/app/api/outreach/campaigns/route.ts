import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const tenantId = req.nextUrl.searchParams.get("tenantId");

    if (!tenantId) {
        return NextResponse.json({ error: "Missing tenantId" }, { status: 400 });
    }

    try {
        const campaigns = await prisma.outreachCampaign.findMany({
            where: { tenantId },
            orderBy: { createdAt: "desc" },
            include: {
                _count: {
                    select: { messages: true }
                }
            }
        });
        return NextResponse.json(campaigns);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { tenantId, name, channel, template } = body;

        if (!tenantId || !name || !channel) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const campaign = await prisma.outreachCampaign.create({
            data: {
                tenantId,
                name,
                channel,
                template,
                status: "DRAFT",
            },
        });

        return NextResponse.json(campaign);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
