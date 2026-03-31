/**
 * Exporta TODOS los leads scrapeados desde Apify a un CSV consolidado.
 * 
 * Uso:
 *   $env:APIFY_API_TOKEN = "apify_api_xxx"
 *   npx tsx scripts/export-apify-to-csv.ts
 * 
 * Output: leads-export-YYYY-MM-DD.csv
 */

const ACTOR_ID = "nwua9Gu5YrADL7ZDj"; // compass~crawler-google-places
const OUTPUT_FILE = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;

async function apifyGet(path: string, token: string) {
    const res = await fetch(`https://api.apify.com/v2${path}?token=${token}&limit=200`);
    if (!res.ok) throw new Error(`Apify API ${path}: ${res.status}`);
    return res.json();
}

function escapeCSV(val: any): string {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function toRow(p: any): string {
    const cats = Array.isArray(p.categories) ? p.categories.join(" | ") : (p.categoryName || "");
    const emails = Array.isArray(p.emails) ? p.emails.join(" | ") : "";
    const social = Array.isArray(p.socialMedia)
        ? p.socialMedia.map((s: any) => `${s.type}:${s.url}`).join(" | ")
        : "";

    const fields = [
        p.title || p.name || "",
        p.categoryName || "",
        cats,
        p.phone || "",
        p.phoneUnformatted || "",
        emails,
        p.website || "",
        p.address || "",
        p.street || "",
        p.neighborhood || "",
        p.city || "",
        p.postalCode || "",
        p.state || "",
        p.countryCode || "",
        p.location?.lat || "",
        p.location?.lng || "",
        p.totalScore || "",
        p.reviewsCount || "",
        p.url || "",
        p.placeId || "",
        social,
    ];
    return fields.map(escapeCSV).join(",");
}

const HEADERS = [
    "Nombre", "Categoría", "Todas las categorías",
    "Teléfono", "Teléfono sin formato",
    "Emails", "Website",
    "Dirección completa", "Calle", "Barrio", "Ciudad", "CP", "Provincia", "País",
    "Latitud", "Longitud",
    "Rating (0-5)", "Reviews",
    "Google Maps URL", "Place ID",
    "Redes Sociales",
].join(",");

async function main() {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) {
        console.error("❌ Falta APIFY_API_TOKEN.\n   Ejecutá: $env:APIFY_API_TOKEN = 'apify_api_xxx'");
        process.exit(1);
    }

    console.log("🔍 Obteniendo runs del actor...");
    const runsData = await apifyGet(`/acts/${ACTOR_ID}/runs`, token);
    const runs = (runsData.data?.items || []).filter((r: any) => r.status === "SUCCEEDED");
    console.log(`   ✅ ${runs.length} runs exitosos encontrados\n`);

    const allPlaces: any[] = [];
    const seen = new Set<string>();

    for (const run of runs) {
        const datasetId = run.defaultDatasetId;
        if (!datasetId) continue;

        process.stdout.write(`📥 Run ${run.id.slice(0, 8)}... `);
        try {
            const res = await fetch(
                `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&format=json&limit=1000`
            );
            if (!res.ok) { console.log(`⚠️ ${res.status}`); continue; }
            const items: any[] = await res.json();

            let added = 0;
            for (const item of items) {
                // Deduplicar por placeId o nombre
                const key = item.placeId || item.title || item.name || Math.random().toString();
                if (!seen.has(key)) {
                    seen.add(key);
                    allPlaces.push(item);
                    added++;
                }
            }
            console.log(`${items.length} items, ${added} nuevos`);
        } catch (e: any) {
            console.log(`❌ ${e.message}`);
        }
    }

    console.log(`\n📊 Total únicos: ${allPlaces.length}`);
    console.log(`📝 Generando ${OUTPUT_FILE}...`);

    const { writeFileSync } = await import("fs");
    const rows = allPlaces.map(toRow);
    writeFileSync(OUTPUT_FILE, "\uFEFF" + HEADERS + "\n" + rows.join("\n"), "utf-8");
    // \uFEFF = BOM para que Excel abra UTF-8 correntamente

    console.log(`\n✅ Listo! Abrí el archivo: ${OUTPUT_FILE}`);
    console.log(`   📁 Ubicación: ${process.cwd()}\\${OUTPUT_FILE}`);
}

main().catch(console.error);
