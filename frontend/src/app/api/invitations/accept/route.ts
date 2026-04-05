import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { sha256 } from "@/lib/auth/hash";
import { hashPassword } from "@/lib/auth/password";
import { z } from "zod";
import { ratelimit } from "@/lib/ratelimit";

const acceptSchema = z
  .object({
    token: z.string().min(1),
    mode: z.enum(["password", "oauth"]),
    password: z.string().min(8).optional(),
    oauthProvider: z.string().optional(),
    oauthProviderId: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.mode === "password" && !data.password) return false;
      if (
        data.mode === "oauth" &&
        (!data.oauthProvider || !data.oauthProviderId)
      )
        return false;
      return true;
    },
    {
      message: "Faltan credenciales para el modo seleccionado",
    },
  );

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
    // 0. Rate Limiting
    const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
    const { success: limitOk } = await ratelimit.limit(
      `invitation:accept:${ip}`,
    );
    if (!limitOk) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const result = acceptSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.flatten() },
        { status: 400 },
      );
    }

    const { token, mode, password, oauthProvider, oauthProviderId } =
      result.data;

    const tokenHash = sha256(token);

    const txResult = await prisma.$transaction(async (tx: any) => {
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
          mode === "password" && password
            ? {
                passwordHash: hashPassword(password),
              }
            : {},
        create:
          mode === "password" && password
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
          role: invitation.role as Role,
          status: "ACTIVE",
          acceptedAt,
        },
        create: {
          userId: user.id,
          tenantId: invitation.tenantId,
          role: invitation.role as Role,
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
      membershipId: txResult.membership.id,
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
