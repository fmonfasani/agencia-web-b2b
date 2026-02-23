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
  const password = "AdminPassword2026!"; // User should change this immediately
  const tenantName = "Agencia LEADS";

  console.log("Creating initial tenant and admin user...");

  // 1. Create Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: tenantName,
    },
  });

  // 2. Create Admin User
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hashPassword(password),
    },
  });

  // 3. Create Membership as OWNER
  await prisma.membership.create({
    data: {
      userId: user.id,
      tenantId: tenant.id,
      role: "OWNER",
      status: "ACTIVE",
    },
  });

  console.log("-----------------------------------------");
  console.log("✅ Admin created successfully!");
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Tenant: ${tenantName} (${tenant.id})`);
  console.log("-----------------------------------------");
  console.log("Please log in and CHANGE YOUR PASSWORD.");
}

main()
  .catch((e) => {
    console.error("Error creating admin:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
