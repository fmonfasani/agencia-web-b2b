import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { signIn } from "@/lib/auth";
import { logAuditEvent } from "@/lib/security/audit";
import crypto from "crypto";

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
    const body = await request.json();
    const email = body.email?.toString().toLowerCase().trim();
    const {
      firstName,
      lastName,
      whatsapp,
      companyName,
      website,
      plan: planCode,
      password,
    } = body;

    if (!firstName || !lastName || !companyName || !email || !password) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser?.passwordHash) {
      return NextResponse.json(
        { error: "Este email ya está registrado" },
        { status: 400 },
      );
    }

    const selectedPlanCode = planCode || "STARTER";
    const plan = await prisma.plan.findUnique({
      where: { code: selectedPlanCode },
    });

    const passwordHash = hashPassword(password);

    const baseSlug = generateSlug(companyName);
    const existingSlug = await prisma.tenant.findUnique({
      where: { slug: baseSlug },
    });
    const slug = existingSlug ? `${baseSlug}-${Date.now()}` : baseSlug;

    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const apiKey = `wh_${crypto.randomBytes(16).toString("hex")}`;
        
        const user = await tx.user.upsert({
          where: { email },
          update: {
            firstName,
            lastName,
            whatsapp,
          },
          create: {
            email,
            passwordHash,
            firstName,
            lastName,
            whatsapp: whatsapp || null,
            status: "ACTIVE",
            emailVerified: null,
            apiKey,
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

        // Set default tenant
        await tx.user.update({
          where: { id: user.id },
          data: { 
            defaultTenantId: tenant.id,
            role: "ADMIN" 
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

        await tx.pipeline.create({
          data: {
            tenantId: tenant.id,
            name: "Pipeline Principal",
            isDefault: true,
          },
        });

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

        await tx.businessEvent.create({
          data: {
            tenantId: tenant.id,
            type: "TENANT_CREATED",
            payload: { companyName, email, plan: selectedPlanCode },
            source: "api",
          },
        });

        return { user, tenant };
      },
    );

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

    await logAuditEvent({
      eventType: "COMPANY_REGISTERED",
      userId: result.user.id,
      tenantId: result.tenant.id,
      metadata: { companyName, plan: selectedPlanCode },
    });

    // NextAuth v5 server-side signIn in a Route Handler doesn't persist cookies correctly.
    // We return success and let the client-side handle the sign-in flow to get the session.

    return NextResponse.json(
      {
        success: true,
        message: "Empresa registrada con éxito",
        tenantId: result.tenant.id,
        slug: result.tenant.slug,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("COMPANY_REGISTER_ERROR:", error);
    return NextResponse.json(
      { error: "Error interno al registrar la empresa" },
      { status: 500 },
    );
  }
}
