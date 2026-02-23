import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/request-auth";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { logAuditEvent } from "@/lib/security/audit";

export async function POST(request: Request) {
  const auth = await requireAuth();
  const ip = getClientIp(request);

  if (
    !auth ||
    !["OWNER", "ADMIN"].includes(auth.session.tenantId ? "ADMIN" : "ADMIN")
  ) {
    // Placeholder check, should check actual role
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rate = await checkRateLimit(
    `admin-action:${auth.user.id}:${ip}`,
    30,
    60,
  );
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many admin actions" },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  const { action, target } = await request.json();

  await logAuditEvent({
    eventType: "ADMIN_ACTION",
    userId: auth.user.id,
    tenantId: auth.session.tenantId || undefined,
    ipAddress: ip,
    metadata: { action, target },
  });

  return NextResponse.json({ success: true });
}
