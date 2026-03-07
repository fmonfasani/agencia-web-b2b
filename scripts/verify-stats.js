const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function verify() {
    console.log("📊 System Verification Stats:");
    const leads = await prisma.lead.count();
    const rum = await prisma.rumEvent.count();
    const costs = await prisma.apiCostEvent.count();
    const ops = await prisma.operationEvent.count();
    const tenants = await prisma.tenant.count();

    console.log(`- Leads: ${leads}`);
    console.log(`- RUM Events: ${rum}`);
    console.log(`- API Cost Events (FinOps): ${costs}`);
    console.log(`- Operation Events (Heatmaps): ${ops}`);
    console.log(`- Tenants: ${tenants}`);

    if (costs > 0 && ops > 0) {
        console.log("✅ Phases 1-4 Data Persistence Verified!");
    } else {
        console.log("⚠️ Verification data missing. Check seeding script.");
    }
}

verify()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
