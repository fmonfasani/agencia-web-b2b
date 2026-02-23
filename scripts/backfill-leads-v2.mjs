import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function backfill() {
  console.log("Starting backfill for Leads V2 architecture...");

  const leads = await prisma.lead.findMany({
    where: {
      sourceType: {
        notIn: ["SCRAPER", "MANUAL", "API", "ADS"],
      },
    },
  });

  console.log(`Found ${leads.length} leads to migrate.`);

  for (const lead of leads) {
    // Basic migration logic
    const updateData = {
      sourceType: "MANUAL",
      potentialScore: lead.budget ? 50 : 20, // Simple heuristic for old data
      completeness: lead.email && lead.name ? 0.5 : 0.2,
      priority: lead.budget ? "MEDIUM" : "LOW",
    };

    await prisma.lead.update({
      where: { id: lead.id },
      data: updateData,
    });
  }

  console.log("Backfill complete.");
}

backfill()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
