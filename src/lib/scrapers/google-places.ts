import { ingestLead, LeadIngestInput } from "../leads/ingest.service";
import { placesRequest } from "../observability/places-client";

/**
 * Service to interact with external data sources for lead generation.
 * Optimized for Google Places logic with FinOps transparency.
 */

export interface ScrapeOptions {
    tenantId: string;
    query: string;
    location?: string;
    radius?: number;
    limit?: number;
}

export async function triggerGooglePlacesScrape(options: ScrapeOptions) {
    console.log(`[Scraper] Starting FinOps-tracked scrape for tenant ${options.tenantId} with query: ${options.query}`);

    try {
        // 1. Search via Tracked Places Client
        const data = await placesRequest<any>({
            tenantId: options.tenantId,
            endpoint: "searchText",
            params: {
                textQuery: options.query,
                // Location bias or circle can be added here if needed
            }
        });

        const places = data.places || [];

        const results = [];

        // 2. Ingest results
        for (const place of places) {
            const leadInput: LeadIngestInput = {
                tenantId: options.tenantId,
                sourceType: "SCRAPER",
                name: place.displayName?.text || "Unknown",
                address: place.formattedAddress,
                googlePlaceId: place.id,
                website: place.websiteUri,
                phone: place.internationalPhoneNumber,
                rating: place.rating,
                reviewsCount: place.userRatingCount,
                category: options.query,
                rawMetadata: place,
            };

            const lead = await ingestLead(leadInput);
            results.push(lead);
        }

        return {
            success: true,
            processed: results.length,
            leads: results,
        };
    } catch (error) {
        console.error("[Scraper Error]:", error);
        throw error;
    }
}
