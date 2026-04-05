import { NextResponse, NextRequest } from "next/server";
import { PerformanceAnalytics } from "@/lib/observability/analytics/PerformanceAnalytics";
import { handleApiError } from "@/lib/api/handle-api-error";
import { z } from "zod";

// Validation schema for heatmap parameters
const heatmapParamsSchema = z.object({
  days: z.number().int().min(1).max(365).default(7),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get("days");

    // Validate and parse days parameter
    const validation = heatmapParamsSchema.safeParse({
      days: daysParam ? parseInt(daysParam) : 7,
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid days parameter. Must be between 1 and 365",
          details: validation.error.flatten(),
        },
        { status: 400 },
      );
    }

    const heatmapData = await PerformanceAnalytics.getHeatmapData(
      validation.data.days,
    );

    return NextResponse.json(heatmapData);
  } catch (error) {
    const { message, status } = handleApiError(
      error,
      "Failed to fetch heatmap data",
    );
    return NextResponse.json({ error: message }, { status });
  }
}
