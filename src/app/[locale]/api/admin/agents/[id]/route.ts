import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AgentType, AgentChannel } from "@prisma/client";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id || !session.user.tenantId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name, type, channel, promptConfig, assistantId, active } = body;

        const agent = await prisma.agent.update({
            where: {
                id,
                tenantId: session.user.tenantId, // Seguridad: asegurar que pertenece al tenant
            },
            data: {
                name,
                type: type as AgentType,
                channel: channel as AgentChannel,
                promptConfig,
                assistantId,
                active,
            },
        });

        return NextResponse.json(agent);
    } catch (error: any) {
        console.error("PATCH_AGENT_ERROR:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id || !session.user.tenantId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await prisma.agent.delete({
            where: {
                id,
                tenantId: session.user.tenantId,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("DELETE_AGENT_ERROR:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
