import { AuditEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { hashPassword } from "@/lib/auth/password";
import { IAMService } from "../iam/iam.service";
import { logger } from "@/lib/logger";

/**
 * Secure Password Recovery Flow
 */
export const PasswordRecovery = {
  /**
   * 1. Initiate Request
   */
  async requestReset(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return; // Silent return for security

    // Invalidate existing recovery tokens
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    // Generate secure random token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
      },
    });

    // TODO: Send Email with rawToken
    logger.warn("[AUTH] Password reset requested", { email });

    await IAMService.logAudit(
      user.id,
      user.id,
      "SYSTEM",
      AuditEventType.ADMIN_ACTION,
      { action: "PASSWORD_RESET_REQUESTED" },
    );
  },

  /**
   * 2. Complete Reset
   */
  async completeReset(rawToken: string, newPassword: string) {
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const tokenRecord = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
      include: { user: true },
    });

    if (!tokenRecord) throw new Error("Token invalid or expired");

    // Update user
    const passwordHash = hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: tokenRecord.userId },
        data: { passwordHash },
      }),
      // Mark token used
      prisma.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
      // Revoke ALL active sessions for security
      prisma.session.updateMany({
        where: { userId: tokenRecord.userId },
        data: { revokedAt: new Date() },
      }),
    ]);

    await IAMService.logAudit(
      tokenRecord.userId,
      tokenRecord.userId,
      "SYSTEM",
      AuditEventType.ADMIN_ACTION,
      { action: "PASSWORD_RESET_COMPLETED" },
    );
  },
};
