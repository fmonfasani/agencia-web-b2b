import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Plans...");

  // --- Plans ---
  const starter = await prisma.plan.upsert({
    where: { code: "STARTER" },
    update: {
      name: "Starter",
      description: "Ideal para comenzar a automatizar tus ventas",
      price: 49,
      limits: { maxUsers: 3, maxAgents: 1, maxChannels: 1, maxProducts: 1 },
      features: ["crm", "1_agent", "web_channel", "basic_analytics"],
    },
    create: {
      name: "Starter",
      code: "STARTER",
      description: "Ideal para comenzar a automatizar tus ventas",
      price: 49,
      limits: { maxUsers: 3, maxAgents: 1, maxChannels: 1, maxProducts: 1 },
      features: ["crm", "1_agent", "web_channel", "basic_analytics"],
    },
  });

  const pro = await prisma.plan.upsert({
    where: { code: "PRO" },
    update: {
      name: "Pro",
      description: "Para agencias que escalan con múltiples agentes IA",
      price: 149,
      limits: {
        maxUsers: 10,
        maxAgents: 5,
        maxChannels: -1,
        maxProducts: -1,
      },
      features: [
        "crm",
        "5_agents",
        "multi_channel",
        "advanced_analytics",
        "pipeline",
        "deals",
      ],
    },
    create: {
      name: "Pro",
      code: "PRO",
      description: "Para agencias que escalan con múltiples agentes IA",
      price: 149,
      limits: {
        maxUsers: 10,
        maxAgents: 5,
        maxChannels: -1,
        maxProducts: -1,
      },
      features: [
        "crm",
        "5_agents",
        "multi_channel",
        "advanced_analytics",
        "pipeline",
        "deals",
      ],
    },
  });

  const enterprise = await prisma.plan.upsert({
    where: { code: "ENTERPRISE" },
    update: {
      name: "Enterprise",
      description: "Ilimitado. API access y Webhooks personalizados",
      price: 499,
      limits: {
        maxUsers: -1,
        maxAgents: -1,
        maxChannels: -1,
        maxProducts: -1,
      },
      features: [
        "crm",
        "unlimited_agents",
        "all_channels",
        "custom_webhooks",
        "api_access",
        "white_label",
        "sla",
      ],
    },
    create: {
      name: "Enterprise",
      code: "ENTERPRISE",
      description: "Ilimitado. API access y Webhooks personalizados",
      price: 499,
      limits: {
        maxUsers: -1,
        maxAgents: -1,
        maxChannels: -1,
        maxProducts: -1,
      },
      features: [
        "crm",
        "unlimited_agents",
        "all_channels",
        "custom_webhooks",
        "api_access",
        "white_label",
        "sla",
      ],
    },
  });

  console.log("✅ Plans seeded:", {
    starter: starter.id,
    pro: pro.id,
    enterprise: enterprise.id,
  });

  // --- Default Tenant (for local dev) ---
  const tenant = await prisma.tenant.upsert({
    where: { id: "default-tenant" },
    update: { name: "Default Tenant" },
    create: {
      id: "default-tenant",
      name: "Default Tenant",
      slug: "default-tenant",
      status: "ACTIVE",
      onboardingDone: true,
    },
  });

  // --- Default Admin User ---
  const owner = await prisma.user.upsert({
    where: { email: "owner@default-tenant.local" },
    update: {},
    create: {
      email: "owner@default-tenant.local",
      firstName: "Admin",
      lastName: "Default",
      passwordHash: "seed-password-hash-placeholder",
      status: "ACTIVE",
      emailVerified: true,
    },
  });

  // --- Default Membership ---
  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: owner.id, tenantId: tenant.id } },
    update: { role: "ADMIN", status: "ACTIVE" },
    create: {
      userId: owner.id,
      tenantId: tenant.id,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  // --- Default Pipeline ---
  const existingPipeline = await prisma.pipeline.findFirst({
    where: { tenantId: tenant.id, isDefault: true },
  });

  if (!existingPipeline) {
    await prisma.pipeline.create({
      data: {
        tenantId: tenant.id,
        name: "Pipeline Principal",
        isDefault: true,
      },
    });
  }

  console.log("✅ Seed completed", { tenantId: tenant.id, ownerId: owner.id });
}

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
