import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export const SESSION_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS ?? 12);
const ROTATION_WINDOW_MIN = Number(process.env.SESSION_ROTATE_MINUTES ?? 30);

export async function updateSessionTenant(sessionId: string, tenantId: string) {
  return await prisma.session.update({
    where: { id: sessionId },
    data: { tenantId },
  });
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string, tenantId?: string) {
  try {
    const token = randomBytes(32).toString("hex");
    const sessionToken = hashToken(token);
    const expires = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);

    const session = await prisma.session.create({
      data: {
        userId,
        sessionToken,
        expires,
        tenantId,
      },
    });

    console.log(`SESSION_DEBUG: Created session for user ${userId} with token ${sessionToken.substring(0, 10)}...`);

    return { token, session };
  } catch (error: any) {
    console.error("SESSION_ERROR: Failed to create session:", error);
    throw error;
  }
}

export async function validateSession(rawToken: string) {
  const sessionToken = hashToken(rawToken);
  const session = await prisma.session.findUnique({ where: { sessionToken } });

  if (!session || session.revokedAt || session.expires < new Date()) {
    return null;
  }

  const shouldRotate =
    session.expires.getTime() - Date.now() < ROTATION_WINDOW_MIN * 60 * 1000;

  if (!shouldRotate) {
    return { session, token: rawToken, rotated: false };
  }

  const nextToken = randomBytes(32).toString("hex");
  const nextTokenHash = hashToken(nextToken);
  const newExpires = new Date(
    Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000,
  );

  const rotated = await prisma.$transaction(async (tx) => {
    await tx.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return tx.session.create({
      data: {
        userId: session.userId,
        sessionToken: nextTokenHash,
        expires: newExpires,
        tenantId: session.tenantId,
      },
    });
  });

  return { session: rotated, token: nextToken, rotated: true };
}

export async function revokeSession(rawToken: string) {
  const sessionToken = hashToken(rawToken);
  await prisma.session.updateMany({
    where: { sessionToken, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserSessions(userId: string) {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
