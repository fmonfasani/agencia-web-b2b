import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

function hashKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const memberships = await prisma.membership.findMany({ where: { userId: user.id, status: "ACTIVE" } });
    const tenantId = request.nextUrl.searchParams.get("tenantId") || memberships[0]?.tenantId;

    if (!tenantId || !memberships.some((m) => m.tenantId === tenantId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const keys = await prisma.agentApiKey.findMany({
      where: { agent: { tenantId } },
      include: { agent: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      keys: keys.map((key) => ({
        id: key.id,
        label: key.label,
        active: key.active,
        scopes: ["agents:execute", "usage:read"],
        lastUsedAt: key.lastUsedAt,
        createdAt: key.createdAt,
        agentId: key.agentId,
        agentName: key.agent.name,
      })),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { tenantId, agentId, label } = await request.json();
    if (!tenantId || !agentId || !label) {
      return NextResponse.json({ error: "tenantId, agentId, label are required" }, { status: 400 });
    }

    const membership = await prisma.membership.findFirst({ where: { userId: user.id, tenantId, status: "ACTIVE" } });
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const rawKey = `wk_${crypto.randomBytes(24).toString("hex")}`;

    const apiKey = await prisma.agentApiKey.create({
      data: {
        agentId,
        label,
        keyHash: hashKey(rawKey),
      },
    });

    return NextResponse.json({ id: apiKey.id, rawKey, label: apiKey.label }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const existing = await prisma.agentApiKey.findUnique({ where: { id }, include: { agent: true } });
    if (!existing?.agent.tenantId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const membership = await prisma.membership.findFirst({
      where: { userId: user.id, tenantId: existing.agent.tenantId, status: "ACTIVE" },
    });

    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.agentApiKey.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
