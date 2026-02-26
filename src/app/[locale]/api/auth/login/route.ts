import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import {
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/security/cookies";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { logAuditEvent } from "@/lib/security/audit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rate = await checkRateLimit(`login:${ip}`, 5, 60);

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts" },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSec) },
      },
    );
  }

  const { email, password } = await request.json();

  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: true },
  });

  if (
    !user ||
    (user.passwordHash && !verifyPassword(password, user.passwordHash))
  ) {
    await logAuditEvent({
      eventType: "LOGIN_FAILED",
      userId: user?.id,
      ipAddress: ip,
      metadata: { email },
    });
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const defaultTenantId = user.memberships?.[0]?.tenantId;
  const { token, session } = await createSession(user.id, defaultTenantId);

  await logAuditEvent({
    eventType: "LOGIN_SUCCESS",
    userId: user.id,
    tenantId: defaultTenantId,
    ipAddress: ip,
  });

  console.log(
    `AUTH_DEBUG: Login success for ${email}. Session created. Cookie: ${SESSION_COOKIE_NAME}`,
  );

  const response = NextResponse.json({ success: true });
  response.cookies.set(
    SESSION_COOKIE_NAME,
    token,
    getSessionCookieOptions(session.expires),
  );
  return response;
}
