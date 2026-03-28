import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma, getTenantPrisma } from "@/lib/prisma";
import {
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/security/cookies";
import { validateSession, updateSessionTenant } from "@/lib/auth/session";

type ChangeTenantRequest = {
  tenantId?: string;
};

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!rawToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const validated = await validateSession(rawToken);
  if (!validated) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const { session, token } = validated;

  const body = (await request.json()) as ChangeTenantRequest;
  const tenantId = body.tenantId?.trim();

  if (!tenantId) {
    return NextResponse.json(
      { error: "tenantId is required" },
      { status: 400 },
    );
  }

  const tPrisma = getTenantPrisma(tenantId);
  const membership = await tPrisma.membership.findFirst({
    where: {
      userId: session.userId,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Actualizar la sesión en la DB con el nuevo tenant activo
  await updateSessionTenant(session.id, tenantId);

  const response = NextResponse.json({ activeTenantId: tenantId });

  // Actualizar la cookie por si acaso hubo rotación o para extender vida si quisiéramos
  // Aunque validateSession ya maneja la rotación interna
  response.cookies.set(
    SESSION_COOKIE_NAME,
    token,
    getSessionCookieOptions(session.expires),
  );

  return response;
}
