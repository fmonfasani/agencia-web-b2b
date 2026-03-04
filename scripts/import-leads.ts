/**
 * Script para importar todos los leads de Apify directamente a la DB via Prisma.
 * Uso: npx tsx scripts/import-leads.ts
 * Descarga todos los datasets de los runs de Apify e importa a la DB.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
if (!APIFY_TOKEN) {
    console.error("❌ Requiere: APIFY_API_TOKEN=tu_token npx tsx scripts/import-leads.ts");
    process.exit(1);
}
const TENANT_ID = process.env.DEFAULT_TENANT_ID || "cmmb7uaqe0002js04qbetwu40";

// Dataset IDs de todos los runs exitosos
const DATASET_IDS = [
    "NXaFNr1yIjpY23GEU",  // 5  places
    "YYjDOF8BeJhVK01zt",  // 5  places
    "FMAU12clEpT9mCbr4",  // 5  places
    "KgJcFv2RG9Ahn0Xtd",  // 25 places
    "Ta7upjl9NTY13s604",  // 25 places
    "ihIUL1oQVdfwJgZn8",  // 20 places
    "TdGhXw2e7Zj3egYZZ",  // 20 places
];

async function fetchDataset(datasetId: string): Promise<any[]> {
    const url = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&format=json&limit=1000`;
    const res = await fetch(url);
    if (!res.ok) {
        console.warn(`  ⚠️  Dataset ${datasetId} returned ${res.status}`);
        return [];
    }
    return res.json();
}

async function main() {
    console.log(`🔌 Conectando a la DB...`);
    console.log(`📌 Tenant: ${TENANT_ID}\n`);

    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const datasetId of DATASET_IDS) {
        console.log(`\n📥 Descargando dataset ${datasetId}...`);
        const places = await fetchDataset(datasetId);
        console.log(`   ${places.length} lugares encontrados`);

        for (const place of places) {
            const name = place.title || place.name || "Sin nombre";
            const phone = place.phone || place.phoneUnformatted || null;
            const website = (place.website || "").substring(0, 500) || null;
            const address = place.street
                ? `${place.street}, ${place.city || ""}`.trim()
                : place.address || null;
            const description = place.categoryName || (place.categories || []).join(", ") || null;
            const score = Math.min(100, Math.round((place.totalScore || 3) * 20));

            // Saltar si ya existe (por nombre + tenant)
            const exists = await prisma.lead.findFirst({
                where: { tenantId: TENANT_ID, name },
                select: { id: true },
            });

            if (exists) {
                skipped++;
                continue;
            }

            try {
                await prisma.lead.create({
                    data: {
                        tenantId: TENANT_ID,
                        name,
                        companyName: name,
                        email: null,
                        phone,
                        website,
                        address,
                        description,
                        sourceType: "SCRAPER",
                        status: "NEW",
                        potentialScore: score,
                        googlePlaceId: place.placeId || null,
                        googleMapsUrl: place.url || null,
                        rawMetadata: place as any,
                    },
                });
                console.log(`   ✅ ${name}`);
                inserted++;
            } catch (e: any) {
                console.error(`   ❌ ${name}: ${e.message}`);
                errors++;
            }
        }
    }

    console.log(`\n${"=".repeat(50)}`);
    console.log(`✅ Insertados: ${inserted}`);
    console.log(`⏭️  Skipped:   ${skipped} (duplicados)`);
    console.log(`❌ Errores:    ${errors}`);
    console.log(`${"=".repeat(50)}`);

    await prisma.$disconnect();
}

main();
