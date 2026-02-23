import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const email = "fmonfasani@gmail.com";
  const password = "AdminPassword2026!";
  const tenantName = "Agencia LEADS";

  console.log("Upserting tenant and admin user...");

  // 1. Upsert Tenant
  let tenant = await prisma.tenant.findFirst({
    where: { name: tenantName },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { name: tenantName },
    });
  }

  // 2. Upsert Admin User with fresh password
  const hashedPassword = hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash: hashedPassword,
    },
    create: {
      email,
      passwordHash: hashedPassword,
    },
  });

  // 3. Upsert Membership as OWNER
  await prisma.membership.upsert({
    where: {
      userId_tenantId: {
        userId: user.id,
        tenantId: tenant.id,
      },
    },
    update: {
      role: "OWNER",
      status: "ACTIVE",
    },
    create: {
      userId: user.id,
      tenantId: tenant.id,
      role: "OWNER",
      status: "ACTIVE",
    },
  });

  console.log("-----------------------------------------");
  console.log("✅ Admin RESET successfully!");
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Tenant: ${tenantName}`);
  console.log("-----------------------------------------");
}

main()
  .catch((e) => {
    console.error("Error resetting admin:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
