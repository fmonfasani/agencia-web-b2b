import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import {
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/security/cookies";
import { logAuditEvent } from "@/lib/security/audit";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}

export async function POST(request: Request) {
  try {
    const {
      firstName,
      lastName,
      email,
      whatsapp,
      companyName,
      website,
      plan: planCode,
      password,
    } = await request.json();

    // Validate required fields
    if (!firstName || !lastName || !companyName || !email || !password) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 },
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser?.passwordHash) {
      return NextResponse.json(
        { error: "Este email ya está registrado" },
        { status: 400 },
      );
    }

    // Resolve plan from DB (or use STARTER as fallback)
    const selectedPlanCode = planCode || "STARTER";
    const plan = await prisma.plan.findUnique({
      where: { code: selectedPlanCode },
    });

    // Hash password
    const passwordHash = hashPassword(password);

    // Build unique slug for the tenant
    const baseSlug = generateSlug(companyName);
    const existingSlug = await prisma.tenant.findUnique({
      where: { slug: baseSlug },
    });
    const slug = existingSlug ? `${baseSlug}-${Date.now()}` : baseSlug;

    // Atomic transaction: User + Tenant + Membership + Subscription
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { email },
        update: { passwordHash, firstName, lastName, whatsapp },
        create: {
          email,
          passwordHash,
          firstName,
          lastName,
          whatsapp: whatsapp || null,
          status: "ACTIVE",
          emailVerified: null,
        },
      });

      const tenant = await tx.tenant.create({
        data: {
          name: companyName,
          slug,
          website: website || null,
          whatsapp: whatsapp || null,
          status: "ACTIVE",
          onboardingDone: false,
        },
      });

      await tx.membership.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          role: "ADMIN",
          status: "ACTIVE",
        },
      });

      // Create default pipeline for this tenant
      await tx.pipeline.create({
        data: {
          tenantId: tenant.id,
          name: "Pipeline Principal",
          isDefault: true,
        },
      });

      // Create subscription if plan exists
      if (plan) {
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        await tx.subscription.create({
          data: {
            tenantId: tenant.id,
            planId: plan.id,
            status: "ACTIVE",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
        });
      }

      // Emit TENANT_CREATED business event
      await tx.businessEvent.create({
        data: {
          tenantId: tenant.id,
          type: "TENANT_CREATED",
          payload: { companyName, email, plan: selectedPlanCode },
          source: "api",
        },
      });

      return { user, tenant };
    });

    // Emit SUBSCRIPTION_ACTIVATED (outside transaction for resilience)
    if (plan) {
      await prisma.businessEvent.create({
        data: {
          tenantId: result.tenant.id,
          type: "SUBSCRIPTION_ACTIVATED",
          payload: { plan: selectedPlanCode, companyName },
          source: "system",
        },
      });
    }

    // Create session
    const { token: sessionToken, session } = await createSession(
      result.user.id,
      result.tenant.id,
    );

    await logAuditEvent({
      eventType: "COMPANY_REGISTERED",
      userId: result.user.id,
      tenantId: result.tenant.id,
      metadata: { companyName, plan: selectedPlanCode },
    });

    const response = NextResponse.json(
      {
        success: true,
        message: "Empresa registrada con éxito",
        tenantId: result.tenant.id,
        slug: result.tenant.slug,
      },
      { status: 201 },
    );

    response.cookies.set(
      SESSION_COOKIE_NAME,
      sessionToken,
      getSessionCookieOptions(session.expires),
    );

    return response;
  } catch (error) {
    console.error("COMPANY_REGISTER_ERROR:", error);
    return NextResponse.json(
      { error: "Error interno al registrar la empresa" },
      { status: 500 },
    );
  }
}
