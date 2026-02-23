import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { requireAuth } from "@/lib/auth/request-auth";
import { revokeAllUserSessions } from "@/lib/auth/session";
import { getClientIp } from "@/lib/security/rate-limit";
import { logAuditEvent } from "@/lib/security/audit";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await request.json();

  if (
    auth.user.passwordHash &&
    !verifyPassword(currentPassword, auth.user.passwordHash)
  ) {
    return NextResponse.json(
      { error: "Current password is invalid" },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { id: auth.user.id },
    data: { passwordHash: hashPassword(newPassword) },
  });

  await revokeAllUserSessions(auth.user.id);

  await logAuditEvent({
    eventType: "PASSWORD_CHANGED",
    userId: auth.user.id,
    tenantId: auth.session.tenantId || undefined,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({
    success: true,
    message: "Password updated. Please log in again.",
  });
}
