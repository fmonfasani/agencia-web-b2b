import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import {
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/security/cookies";
import { logAuditEvent } from "@/lib/security/audit";

export async function POST(request: Request) {
  try {
    const { email, password, token } = await request.json();

    if (!token || !email || !password) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // 1. Validar invitación
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

    // 2. Hash password
    const passwordHash = hashPassword(password);

    // 3. Crear o actualizar usuario
    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash },
      create: {
        email,
        passwordHash,
      },
    });

    // 4. Crear membresía en el tenant invitado
    await prisma.membership.upsert({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId: invitation.tenantId,
        },
      },
      update: {
        role: invitation.role,
        status: "ACTIVE",
      },
      create: {
        userId: user.id,
        tenantId: invitation.tenantId,
        role: invitation.role,
        status: "ACTIVE",
      },
    });

    // 5. Marcar invitación como aceptada
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        acceptedById: user.id,
      },
    });

    // 6. Crear sesión
    const { token: sessionToken, session } = await createSession(
      user.id,
      invitation.tenantId,
    );

    await logAuditEvent({
      eventType: "INVITATION_ACCEPTED",
      userId: user.id,
      tenantId: invitation.tenantId,
      metadata: { invitationId: invitation.id },
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set(
      SESSION_COOKIE_NAME,
      sessionToken,
      getSessionCookieOptions(session.expires),
    );

    return response;
  } catch (error) {
    console.error("INVITE_REGISTER_ERROR:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
