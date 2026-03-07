const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    console.log("🚀 Seeding Verification Data...");

    // 0. Ensure a dummy Tenant exists
    const tenant = await prisma.tenant.upsert({
        where: { id: "test-tenant-id" },
        update: {},
        create: {
            id: "test-tenant-id",
            name: "Test Agency Verification",
            slug: "test-agency-verify"
        }
    });
    console.log(`✅ Using Tenant: ${tenant.name} (${tenant.id})`);

    // 1. Seed API Cost Events with an Anomaly
    const today = new Date();

    // Baseline costs (14 days)
    for (let i = 2; i <= 15; i++) {
        const date = new Date(new Date().setDate(today.getDate() - i));
        if (date.getDay() === 0 || date.getDay() === 6) continue; // Skip weekends

        await prisma.apiCostEvent.create({
            data: {
                tenantId: tenant.id,
                api: "apify_scraper",
                endpoint: "google-maps-scraper",
                costUsd: 2.0,
                timestamp: date
            }
        });
    }

    // Anomaly today: $10.0 (Baseline is $2.0, so >35% deviation)
    await prisma.apiCostEvent.create({
        data: {
            tenantId: tenant.id,
            api: "apify_scraper",
            endpoint: "google-maps-scraper",
            costUsd: 10.0,
            timestamp: today
        }
    });
    console.log("✅ Seeded FinOps Anomaly");

    // 2. Seed RUM Data (Vitals)
    const pages = ["/", "/admin", "/dashboard", "/leads"];
    for (const page of pages) {
        await prisma.rumEvent.create({
            data: {
                sessionId: "test-session-" + Math.random().toString(36).substring(7),
                page,
                metric: "LCP",
                value: 2200 + Math.random() * 500,
                userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            }
        });
    }
    console.log("✅ Seeded RUM Vitals");

    // 3. Seed Operation Events (Heatmap)
    const industries = ["restaurants", "real_estate", "software"];
    const locations = ["Argentina", "USA", "Spain"];

    for (let i = 0; i < 20; i++) {
        await prisma.operationEvent.create({
            data: {
                location: locations[i % 3],
                industry: industries[i % 3],
                provider: i % 2 === 0 ? "apify" : "google",
                operation: "extraction",
                success: Math.random() > 0.1,
                latencyMs: Math.floor(500 + Math.random() * 1000),
                createdAt: new Date(new Date().setDate(today.getDate() - (i % 7)))
            }
        });
    }
    console.log("✅ Seeded Operation Events (Heatmap)");

    // 4. Seed Dummy Leads
    for (let i = 0; i < 5; i++) {
        await prisma.lead.create({
            data: {
                tenantId: tenant.id,
                name: `Verification Lead ${i}`,
                companyName: `Verify Crop ${i}`,
                email: `verify${i}@agency.com`,
                phone: `+549110000000${i}`,
                website: `https://verify-lead-${i}.com`,
                status: "NEW",
                priority: "MEDIUM",
                source: "verification_script",
                sourceType: "MANUAL"
            }
        });
    }
    console.log("✅ Seeded Test Leads");

    console.log("✨ Seeding Complete!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
