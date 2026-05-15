import { defineConfig } from "prisma/config";

const url = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || "";

const directUrl =
  process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || "";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: { url, directUrl },
});
