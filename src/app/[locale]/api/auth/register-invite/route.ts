import { NextResponse } from "next/server";
import { prisma, getTenantPrisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { signIn } from "@/lib/auth";
import { logAuditEvent } from "@/lib/security/audit";

export async function POST(request: Request) {
  try {
    const { email, password, token } = await request.json();

    if (!token || !email || !password) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { tokenHash: token },
    });

    if (
      !invitation ||
      invitation.status !== "PENDING" ||
      invitation.expiresAt < new Date()
    ) {
      return NextResponse.json(
        { error: "Invitación inválida o expirada" },
        { status: 400 },
      );
    }

    if (invitation.email !== email) {
      return NextResponse.json(
        { error: "El email no coincide con la invitación" },
        { status: 400 },
      );
    }

    const tPrisma = getTenantPrisma(invitation.tenantId);

    const passwordHash = hashPassword(password);

    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash },
      create: {
        email,
        passwordHash,
      },
    });

    await tPrisma.membership.upsert({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId: invitation.tenantId,
        },
      },
      update: {
        role: invitation.role as Role,
        status: "ACTIVE",
      },
      create: {
        userId: user.id,
        tenantId: invitation.tenantId,
        role: invitation.role as Role,
        status: "ACTIVE",
      },
    });

    await tPrisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        acceptedById: user.id,
      },
    });

    await logAuditEvent({
      eventType: "INVITATION_ACCEPTED",
      userId: user.id,
      tenantId: invitation.tenantId,
      metadata: { invitationId: invitation.id },
    });

    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (signInResult?.error) {
      return NextResponse.json(
        { error: "Registro exitoso pero error al iniciar sesión" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("INVITE_REGISTER_ERROR:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
