import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id || !session.user.tenantId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const agents = await prisma.agent.findMany({
            where: {
                tenantId: session.user.tenantId,
            },
            orderBy: {
                updatedAt: "desc",
            },
        });

        return NextResponse.json(agents);
    } catch (error: any) {
        console.error("GET_AGENTS_ERROR:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id || !session.user.tenantId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name, type, channel, promptConfig, assistantId } = body;

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const agent = await prisma.agent.create({
            data: {
                name,
                type: type || "COMERCIAL",
                channel: channel || "WEB",
                promptConfig,
                assistantId,
                tenantId: session.user.tenantId,
            },
        });

        return NextResponse.json(agent);
    } catch (error: any) {
        console.error("POST_AGENT_ERROR:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
