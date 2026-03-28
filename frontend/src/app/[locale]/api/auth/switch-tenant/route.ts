import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/request-auth";
import { getClientIp } from "@/lib/security/rate-limit";
import { logAuditEvent } from "@/lib/security/audit";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = await request.json();
  if (!tenantId || typeof tenantId !== "string") {
    return NextResponse.json({ error: "Invalid tenantId" }, { status: 400 });
  }

  const membership = await prisma.membership.findFirst({
    where: {
      userId: auth.user.id,
      tenantId,
      status: "ACTIVE",
    },
    select: { id: true },
  });
  if (!membership) {
    await logAuditEvent({
      eventType: "TENANT_SWITCH_DENIED",
      userId: auth.user.id,
      tenantId,
      ipAddress: getClientIp(request),
      metadata: { previousTenantId: auth.session.tenantId },
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.session.update({
    where: { id: auth.session.id },
    data: { tenantId },
  });

  await logAuditEvent({
    eventType: "TENANT_SWITCH",
    userId: auth.user.id,
    tenantId,
    ipAddress: getClientIp(request),
    metadata: { previousTenantId: auth.session.tenantId },
  });

  return NextResponse.json({ success: true });
}
