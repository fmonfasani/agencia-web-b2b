import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function backfill() {
  console.log("🚀 Starting Optimized Backfill for Leads V2...");

  const oldSources = ["intelligence_engine", "google_maps", "scraper"];

  // Update sourceType for all old leads in one go
  const result = await prisma.lead.updateMany({
    where: {
      OR: oldSources.map((s) => ({ source: s })),
    },
    data: {
      sourceType: "SCRAPER",
      potentialScore: 15,
      priority: "LOW",
      completeness: 0.1,
    },
  });

  console.log(`✨ Success! Updated ${result.count} leads to SCRAPER category.`);
}

backfill()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
