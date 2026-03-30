import { prisma } from "@/lib/prisma";

const GOOGLE_PLACES_API = "https://places.googleapis.com/v1";

const COST_PER_CALL = 0.017; // approximate average cost for Places Nearby / Details

type PlacesRequest = {
  endpoint: string;
  params?: Record<string, string>;
  tenantId: string;
};

export async function placesRequest<T>({
  endpoint,
  params = {},
  tenantId,
}: PlacesRequest): Promise<T> {
  const url = new URL(`${GOOGLE_PLACES_API}/${endpoint}`);

  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: {
      "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY!,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Places API error: ${res.status} ${errorText}`);
  }

  const data = await res.json();

  const responseCount =
    (data as any)?.places?.length || (data as any)?.results?.length || 1;

  const costUsd = COST_PER_CALL * responseCount;

  // Persist cost event (non-blocking)
  prisma.apiCostEvent
    .create({
      data: {
        tenantId,
        api: "google_places",
        endpoint,
        responseCount,
        costUsd,
        timestamp: new Date(),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    })
    .catch((err: any) => console.error("[FinOps Error]:", err));

  return data;
}
