import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  verifySessionToken,
} from "@/lib/auth/session";

type ChangeTenantRequest = {
  tenantId?: string;
};

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!rawToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = verifySessionToken(rawToken);
  if (!session) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const body = (await request.json()) as ChangeTenantRequest;
  const tenantId = body.tenantId?.trim();

  if (!tenantId) {
    return NextResponse.json(
      { error: "tenantId is required" },
      { status: 400 },
    );
  }

  const membership = await prisma.membership.findFirst({
    where: {
      userId: session.sub,
      tenantId,
      status: "ACTIVE",
    },
    select: { tenantId: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = createSessionToken({
    sub: session.sub,
    email: session.email,
    memberships: session.memberships,
    activeTenantId: tenantId,
  });

  const response = NextResponse.json({ activeTenantId: tenantId });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
  });

  return response;
}
