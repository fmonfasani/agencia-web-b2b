import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/security/cookies";
import { validateSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";

export async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    logger.debug("No session token found in cookies");
    return null;
  }

  const validated = await validateSession(token);
  if (!validated) {
    logger.debug("Session token validation failed or expired");
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: validated.session.userId },
  });
  if (!user) return null;

  // Fetch the role from the Membership table
  const membership = await prisma.membership.findFirst({
    where: {
      userId: user.id,
      tenantId: validated.session.tenantId || undefined,
      status: "ACTIVE",
    },
  });

  return {
    user: {
      ...user,
      role: membership?.role || "MEMBER",
    },
    session: validated.session,
    token: validated.token,
    rotated: validated.rotated,
  };
}
