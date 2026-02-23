import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, sha256 } from "@/lib/auth/hash";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token requerido" }, { status: 400 });
  }

  const tokenHash = sha256(token);

  const invitation = await prisma.invitation.findFirst({
    where: {
      tokenHash,
      status: "PENDING",
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      tenant: true,
      invitedBy: true,
    },
  });

  if (!invitation) {
    return NextResponse.json(
      { error: "Invitación inválida o expirada" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    tenant: {
      id: invitation.tenant.id,
      name: invitation.tenant.name,
    },
    invitedBy: invitation.invitedBy.email,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, mode, password, oauthProvider, oauthProviderId } = body;

    if (!token || !mode) {
      return NextResponse.json(
        { error: "token y mode son obligatorios" },
        { status: 400 },
      );
    }

    if (mode === "password" && (!password || String(password).length < 8)) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres." },
        { status: 400 },
      );
    }

    if (mode === "oauth" && (!oauthProvider || !oauthProviderId)) {
      return NextResponse.json(
        { error: "oauthProvider y oauthProviderId son obligatorios." },
        { status: 400 },
      );
    }

    const tokenHash = sha256(token);

    const result = await prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findFirst({
        where: {
          tokenHash,
          status: "PENDING",
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (!invitation) {
        throw new Error("INVITATION_NOT_FOUND");
      }

      const acceptedAt = new Date();

      const user = await tx.user.upsert({
        where: {
          email: invitation.email,
        },
        update:
          mode === "password"
            ? {
                passwordHash: hashPassword(password),
              }
            : {},
        create:
          mode === "password"
            ? {
                email: invitation.email,
                passwordHash: hashPassword(password),
              }
            : {
                email: invitation.email,
              },
      });

      const membership = await tx.membership.upsert({
        where: {
          userId_tenantId: {
            userId: user.id,
            tenantId: invitation.tenantId,
          },
        },
        update: {
          role: invitation.role,
          status: "ACTIVE",
          acceptedAt,
        },
        create: {
          userId: user.id,
          tenantId: invitation.tenantId,
          role: invitation.role,
          status: "ACTIVE",
          acceptedAt,
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: "ACCEPTED",
          acceptedAt,
          acceptedById: user.id,
        },
      });

      await tx.invitationAudit.updateMany({
        where: {
          invitationId: invitation.id,
        },
        data: {
          acceptedAt,
          acceptedById: user.id,
        },
      });

      return { membership };
    });

    return NextResponse.json({
      success: true,
      membershipId: result.membership.id,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVITATION_NOT_FOUND") {
      return NextResponse.json(
        { error: "Invitación inválida o expirada" },
        { status: 404 },
      );
    }

    console.error("Error accepting invitation:", error);
    return NextResponse.json(
      { error: "No se pudo aceptar la invitación." },
      { status: 500 },
    );
  }
}
