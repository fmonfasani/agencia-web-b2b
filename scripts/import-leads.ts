/**
 * Script para importar leads de Apify a la DB via Prisma.
 * 
 * Modos:
 * 1. Archivo local: npx tsx scripts/import-leads.ts ruta/al/archivo.json
 * 2. Todos los archivos de una carpeta: npx tsx scripts/import-leads.ts "scraping download"
 * 3. Desde Apify API: APIFY_API_TOKEN=xxx npx tsx scripts/import-leads.ts
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();
const TENANT_ID = process.env.DEFAULT_TENANT_ID || "cmmb7uaqe0002js04qbetwu40";

const ACTOR_ID = "nwua9Gu5YrADL7ZDj"; // compass~crawler-google-places

async function fetchAllFromApify(): Promise<any[]> {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) return [];

    console.log("🔍 Obteniendo runs del actor desde Apify...");
    const runsRes = await fetch(`https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${token}&limit=200&status=SUCCEEDED`);
    if (!runsRes.ok) { console.warn(`⚠️  Runs API: ${runsRes.status}`); return []; }
    const runsData = await runsRes.json();
    const runs = runsData.data?.items || [];
    console.log(`   ${runs.length} runs exitosos\n`);

    const allPlaces: any[] = [];
    const seen = new Set<string>();

    for (const run of runs) {
        const datasetId = run.defaultDatasetId;
        if (!datasetId) continue;
        process.stdout.write(`📥 Dataset ${datasetId.slice(0, 8)}... `);
        const res = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&format=json&limit=1000`);
        if (!res.ok) { console.log(`⚠️ ${res.status}`); continue; }
        const items: any[] = await res.json();
        let added = 0;
        for (const item of items) {
            const key = item.placeId || item.title || item.name;
            if (key && !seen.has(key)) { seen.add(key); allPlaces.push(item); added++; }
        }
        console.log(`${items.length} items, ${added} nuevos`);
    }
    return allPlaces;
}


function readJsonFile(filePath: string): any[] {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
}

function getJsonFiles(dirOrFile: string): string[] {
    const resolved = path.resolve(dirOrFile);
    if (!fs.existsSync(resolved)) {
        console.error(`❌ No existe: ${resolved}`);
        process.exit(1);
    }
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
        return fs.readdirSync(resolved)
            .filter(f => f.endsWith(".json"))
            .map(f => path.join(resolved, f));
    }
    return [resolved];
}

async function importPlaces(places: any[], source: string): Promise<{ inserted: number; skipped: number; errors: number }> {
    let inserted = 0, skipped = 0, errors = 0;

    for (const place of places) {
        // Filtrar leads fuera de Argentina
        if (place.countryCode && place.countryCode !== "AR") {
            skipped++;
            continue;
        }

        const name = place.title || place.name || "Sin nombre";
        const phone = place.phone || place.phoneUnformatted || null;
        const website = (place.website || "").substring(0, 500) || null;
        const address = place.street ? `${place.street}, ${place.city || ""}`.trim() : place.address || null;
        const description = place.categoryName || (place.categories || []).join(", ") || null;
        const score = Math.min(100, Math.round((place.totalScore || 3) * 20));

        const exists = await prisma.lead.findFirst({
            where: { tenantId: TENANT_ID, name },
            select: { id: true },
        });

        if (exists) { skipped++; continue; }

        try {
            await prisma.lead.create({
                data: {
                    tenantId: TENANT_ID, name, companyName: name,
                    email: null, phone, website, address, description,
                    sourceType: "SCRAPER", status: "NEW", potentialScore: score,
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

    return { inserted, skipped, errors };
}

async function main() {
    console.log(`📌 Tenant: ${TENANT_ID}\n`);

    let totalInserted = 0, totalSkipped = 0, totalErrors = 0;
    const arg = process.argv[2];

    if (arg) {
        // Modo: archivo(s) local(es)
        const files = getJsonFiles(arg);
        console.log(`📁 Procesando ${files.length} archivo(s)...\n`);

        for (const file of files) {
            console.log(`\n📥 ${path.basename(file)}`);
            const places = readJsonFile(file);
            console.log(`   ${places.length} lugares`);
            const { inserted, skipped, errors } = await importPlaces(places, file);
            totalInserted += inserted; totalSkipped += skipped; totalErrors += errors;
        }
    } else {
        // Modo: descargar desde Apify API
        if (!process.env.APIFY_API_TOKEN) {
            console.error("❌ Uso:\n  Archivos locales: npx tsx scripts/import-leads.ts 'scraping download'\n  Desde Apify:      APIFY_API_TOKEN=xxx npx tsx scripts/import-leads.ts");
            process.exit(1);
        }
        const places = await fetchAllFromApify();
        console.log(`\n📊 Total únicos: ${places.length}`);
        const { inserted, skipped, errors } = await importPlaces(places, "apify-api");
        totalInserted += inserted; totalSkipped += skipped; totalErrors += errors;

    }

    console.log(`\n${"=".repeat(50)}`);
    console.log(`✅ Insertados: ${totalInserted}`);
    console.log(`⏭️  Skipped:   ${totalSkipped} (duplicados o fuera de AR)`);
    console.log(`❌ Errores:    ${totalErrors}`);
    console.log(`${"=".repeat(50)}`);

    await prisma.$disconnect();
}

main();
