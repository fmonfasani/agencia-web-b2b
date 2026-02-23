const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function check() {
  try {
    const st = await p.lead.groupBy({ by: ["sourceType"], _count: true });
    console.log("SourceType counts:", st);
    const ls = await p.lead.groupBy({ by: ["source"], _count: true });
    console.log("Legacy source counts:", ls);

    const sample = await p.lead.findMany({ take: 5 });
    console.log("Sample leads:", JSON.stringify(sample, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await p.$disconnect();
  }
}

check();
