import { NextResponse } from "next/server";
import { prisma, getTenantPrisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { signIn } from "@/lib/auth";
import { logAuditEvent } from "@/lib/security/audit";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body.email?.toString().toLowerCase().trim();
    const { password, token } = body;

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

    const apiKey = `wh_${crypto.randomBytes(16).toString("hex")}`;

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        apiKey,
        role: invitation.role as Role,
        defaultTenantId: invitation.tenantId,
      },
      create: {
        email,
        passwordHash,
        apiKey,
        role: invitation.role as Role,
        defaultTenantId: invitation.tenantId,
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

    // NextAuth v5 server-side signIn in a Route Handler doesn't persist cookies correctly.
    // We return success and let the client-side handle the sign-in flow to get the session.

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("INVITE_REGISTER_ERROR:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
