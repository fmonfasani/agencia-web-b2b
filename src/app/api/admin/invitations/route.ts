import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { generateInvitationToken, sha256 } from "@/lib/auth/hash";
import { z } from "zod";
import { ratelimit } from "@/lib/ratelimit";

const invitationSchema = z.object({
  email: z.string().email(),
  tenantId: z.string().cuid(),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]), // SALES_REP removed
  invitedByEmail: z.string().email(),
  tenantName: z.string().optional(),
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

const DEFAULT_EXPIRATION_DAYS = 7;

export async function POST(request: Request) {
  try {
    // 0. Rate Limiting
    const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
    const { success: limitOk } = await ratelimit.limit(`invitation:create:${ip}`);
    if (!limitOk) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const result = invitationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
    }

    const { email, tenantId, role, invitedByEmail, tenantName, expiresInDays } =
      result.data;

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedInvitedByEmail = String(invitedByEmail)
      .toLowerCase()
      .trim();
    const invitationToken = generateInvitationToken();
    const tokenHash = sha256(invitationToken);

    const validDays = expiresInDays || DEFAULT_EXPIRATION_DAYS;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validDays);

    const invitation = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const invitedBy = await tx.user.upsert({
        where: { email: normalizedInvitedByEmail },
        update: {},
        create: { email: normalizedInvitedByEmail },
      });

      await tx.tenant.upsert({
        where: { id: tenantId },
        update: {
          name: tenantName || `Tenant ${tenantId}`,
        },
        create: {
          id: tenantId,
          name: tenantName || `Tenant ${tenantId}`,
        },
      });

      await tx.invitation.updateMany({
        where: {
          email: normalizedEmail,
          tenantId,
          status: "PENDING",
        },
        data: {
          status: "INVALIDATED",
        },
      });

      const createdInvitation = await tx.invitation.create({
        data: {
          email: normalizedEmail,
          tenantId,
          role,
          tokenHash,
          expiresAt,
          invitedById: invitedBy.id,
        },
      });

      await tx.invitationAudit.create({
        data: {
          invitationId: createdInvitation.id,
          tenantId,
          invitedById: invitedBy.id,
          invitedEmail: normalizedEmail,
          role,
          invitedAt: createdInvitation.invitedAt,
        },
      });

      return createdInvitation;
    });

    return NextResponse.json({
      success: true,
      invitationId: invitation.id,
      invitationToken,
      expiresAt: invitation.expiresAt,
    });
  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json(
      { error: "No se pudo crear la invitación." },
      { status: 500 },
    );
  }
}
