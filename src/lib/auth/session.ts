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

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string, tenantId?: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);

  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      tenantId,
    },
  });

  return { token, session };
}

export async function validateSession(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const session = await prisma.session.findUnique({ where: { tokenHash } });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    return null;
  }

  const shouldRotate =
    session.expiresAt.getTime() - Date.now() < ROTATION_WINDOW_MIN * 60 * 1000;

  if (!shouldRotate) {
    return { session, token: rawToken, rotated: false };
  }

  const nextToken = randomBytes(32).toString("hex");
  const nextTokenHash = hashToken(nextToken);
  const newExpiresAt = new Date(
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
        tokenHash: nextTokenHash,
        expiresAt: newExpiresAt,
        rotatedFromSessionId: session.id,
        tenantId: session.tenantId,
      },
    });
  });

  return { session: rotated, token: nextToken, rotated: true };
}

export async function revokeSession(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  await prisma.session.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserSessions(userId: string) {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
