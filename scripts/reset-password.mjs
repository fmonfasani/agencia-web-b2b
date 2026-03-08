import { PrismaClient } from '@prisma/client'
import { randomBytes, scryptSync } from "crypto";

// Logic from src/lib/auth/password.ts
function hashPassword(password) {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
}

const prisma = new PrismaClient()

async function reset(email, newPassword) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        console.log(`Error: User ${email} not found.`);
        return;
    }

    const passwordHash = hashPassword(newPassword);
    await prisma.user.update({
        where: { email },
        data: { passwordHash }
    });

    console.log(`Success: Password for ${email} has been reset.`);
}

const email = process.argv[2];
const pass = process.argv[3];

if (!email || !pass) {
    console.log("Usage: node scripts/reset-password.mjs <email> <newPassword>");
    process.exit(1);
}

reset(email, pass)
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
