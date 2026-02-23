import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenantId = "default-tenant";

  const tenant = await prisma.tenant.upsert({
    where: { id: tenantId },
    update: {},
    create: {
      id: tenantId,
      name: "Default Tenant",
    },
  });

  const result = await prisma.$executeRaw`
    UPDATE "Lead"
    SET "tenantId" = ${tenant.id}
    WHERE "tenantId" IS NULL
  `;

  console.log(
    `Backfill complete. Leads updated: ${result}. Tenant ID: ${tenant.id}`,
  );
}

main()
  .catch((error) => {
    console.error("Backfill failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
