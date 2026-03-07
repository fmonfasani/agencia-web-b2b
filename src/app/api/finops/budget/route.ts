import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { provider, monthly, warning, critical } = body;

        const config = await prisma.budgetConfig.upsert({
            where: { provider },
            create: {
                provider,
                monthly,
                warning: warning || 0.8,
                critical: critical || 0.95
            },
            update: {
                monthly,
                warning: warning || 0.8,
                critical: critical || 0.95
            }
        });

        return NextResponse.json(config);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET() {
    try {
        const configs = await prisma.budgetConfig.findMany();
        return NextResponse.json(configs);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
