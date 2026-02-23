import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInvitationToken, sha256 } from "@/lib/auth/hash";

const DEFAULT_EXPIRATION_DAYS = 7;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, tenantId, role, invitedByEmail, tenantName, expiresInDays } =
      body;

    if (!email || !tenantId || !role || !invitedByEmail) {
      return NextResponse.json(
        {
          error:
            "email, tenantId, role y invitedByEmail son campos obligatorios.",
        },
        { status: 400 },
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedInvitedByEmail = String(invitedByEmail)
      .toLowerCase()
      .trim();
    const invitationToken = generateInvitationToken();
    const tokenHash = sha256(invitationToken);

    const validDays =
      Number(expiresInDays) > 0
        ? Number(expiresInDays)
        : DEFAULT_EXPIRATION_DAYS;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validDays);

    const invitation = await prisma.$transaction(async (tx) => {
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
