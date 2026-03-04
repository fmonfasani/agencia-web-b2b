import { ingestLead, LeadIngestInput } from "../leads/ingest.service";

/**
 * Service to interact with external data sources for lead generation.
 * Currently optimized for Google Places logic.
 */

export interface ScrapeOptions {
    tenantId: string;
    query: string;
    location?: string;
    radius?: number;
}

export async function triggerGooglePlacesScrape(options: ScrapeOptions) {
    console.log(`[Scraper] Starting scrape for tenant ${options.tenantId} with query: ${options.query}`);

    // En una implementación real, aquí llamaríamos a Google Places API o un servicio de scraping como Apify/Outscraper.
    // Por ahora, simularemos la llegada de 1 lead para validar el flujo de ingesta.

    const mockLead: LeadIngestInput = {
        tenantId: options.tenantId,
        sourceType: "SCRAPER",
        name: "Empresa de Prueba Scraped",
        email: "contacto@pruebascraped.com",
        phone: "+5491100000000",
        website: "https://pruebascraped.com",
        category: options.query, // Usamos la query como categoría inicial
        address: options.location || "Buenos Aires, Argentina",
        googlePlaceId: `mock-id-${Date.now()}`,
        rating: 4.5,
        reviewsCount: 120,
    };

    try {
        const persistResult = await ingestLead(mockLead);
        return {
            success: true,
            processed: 1,
            sampleLeadId: persistResult.id
        };
    } catch (error) {
        console.error("[Scraper Error]:", error);
        throw error;
    }
}
