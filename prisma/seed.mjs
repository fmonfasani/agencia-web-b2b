import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. Crear o Actualizar Tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: "default-tenant" },
    update: { name: "Default Tenant" },
    create: {
      id: "default-tenant",
      name: "Default Tenant",
    },
  });

  // 2. Crear o Actualizar Usuario Propietario
  const owner = await prisma.user.upsert({
    where: { email: "owner@default-tenant.local" },
    update: {},
    create: {
      email: "owner@default-tenant.local",
      passwordHash: "seed-password-hash-placeholder",
    },
  });

  // 3. Crear Membresía
  await prisma.membership.upsert({
    where: {
      userId_tenantId: {
        userId: owner.id,
        tenantId: tenant.id,
      },
    },
    update: {
      role: "ADMIN",
      status: "ACTIVE",
    },
    create: {
      userId: owner.id,
      tenantId: tenant.id,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  console.log("Seed completed", { tenantId: tenant.id, ownerId: owner.id });
}

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
