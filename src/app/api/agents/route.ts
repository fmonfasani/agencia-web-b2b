import { NextResponse } from "next/server";
import { prisma, getTenantPrisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { assertPlanLimit } from "@/lib/plan-guard";
import { PlanLimitError } from "@/lib/plan-guard";

export const dynamic = "force-dynamic";

// GET /api/agents — List agents for the current tenant
export async function GET() {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const membership = await prisma.membership.findFirst({
            where: { userId: user.id, status: "ACTIVE" },
            orderBy: { createdAt: "desc" },
        });

        if (!membership) {
            return NextResponse.json({ error: "No tenant found" }, { status: 403 });
        }

        const tPrisma = getTenantPrisma(membership.tenantId);
        const agents = await tPrisma.agent.findMany({
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ agents });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Server Error";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

// POST /api/agents — Create a new agent for the current tenant
export async function POST(req: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const membership = await prisma.membership.findFirst({
            where: { userId: user.id, status: "ACTIVE" },
            orderBy: { createdAt: "desc" },
        });

        if (!membership) {
            return NextResponse.json({ error: "No tenant found" }, { status: 403 });
        }

        const tenantId = membership.tenantId;
        const tPrisma = getTenantPrisma(tenantId);

        // Enforce plan limit
        const currentAgentCount = await tPrisma.agent.count({
            where: { active: true },
        });
        await assertPlanLimit(tenantId, "maxAgents", currentAgentCount);

        const { name, type, channel, promptConfig, knowledgeBase, assistantId } =
            await req.json();

        if (!name) {
            return NextResponse.json(
                { error: "El nombre del agente es requerido" },
                { status: 400 },
            );
        }

        const agent = await tPrisma.agent.create({
            data: {
                tenantId,
                name,
                systemPrompt: promptConfig || "",
                type: type || "COMERCIAL",
                channel: channel || "WEB",
                assistantId: assistantId || null,
                promptConfig: promptConfig || null,
                knowledgeBase: knowledgeBase || null,
                active: true,
            },
        });

        // Emit business event
        await tPrisma.businessEvent.create({
            data: {
                tenantId,
                type: "AGENT_CREATED",
                payload: { agentId: agent.id, agentName: name, type, channel },
                source: "api",
            },
        });

        return NextResponse.json({ agent }, { status: 201 });
    } catch (error: unknown) {
        if (error instanceof PlanLimitError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        const msg = error instanceof Error ? error.message : "Server Error";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
