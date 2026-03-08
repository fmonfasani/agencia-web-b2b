import { PrismaClient } from '@prisma/client'
import { verifyPassword } from './src/lib/auth/password.ts' // This might not work with node -e easily due to imports

// I'll just copy the logic to be safe
import { scryptSync, timingSafeEqual } from "crypto";
function verify(password, storedHash) {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    const computed = scryptSync(password, salt, 64);
    const stored = Buffer.from(hash, "hex");
    if (computed.byteLength !== stored.byteLength) return false;
    return timingSafeEqual(computed, stored);
}

const prisma = new PrismaClient()

async function testLogin(email, password) {
    const user = await prisma.user.findUnique({
        where: { email }
    })
    if (!user) {
        console.log("USER_NOT_FOUND");
        return;
    }
    if (!user.passwordHash) {
        console.log("NO_PASSWORD_HASH");
        return;
    }
    const match = verify(password, user.passwordHash);
    console.log("MATCH:", match);
}

const email = process.argv[2];
const password = process.argv[3];

testLogin(email, password)
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
