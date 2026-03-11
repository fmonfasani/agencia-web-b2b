import { prisma } from "../src/lib/prisma.js";
import "dotenv/config";

async function test() {
  console.log("🚀 Testing Prisma Database Connection...");
  console.log("Database URL prefix:", process.env.POSTGRES_PRISMA_URL?.split("@")[1] || "NOT FOUND");

  try {
    console.log("Attempting to connect...");
    await prisma.$connect();
    console.log("✅ Connected successfully!");

    console.log("Testing query (count users)...");
    const count = await prisma.user.count();
    console.log(`✅ Query successful! User count: ${count}`);

    console.log("Testing model availability...");
    const models = Object.keys(prisma).filter((k) => !k.startsWith("_"));
    console.log(`Available models: ${models.length}`);
    
  } catch (error) {
    console.error("❌ Connection failed!");
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
