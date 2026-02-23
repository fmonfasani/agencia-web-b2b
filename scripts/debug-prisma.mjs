import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
console.log(
  "Keys in prisma:",
  Object.keys(prisma).filter((k) => !k.startsWith("_")),
);
await prisma.$disconnect();
