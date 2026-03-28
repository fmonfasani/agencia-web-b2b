import { NextResponse } from "next/server";
import { PerformanceAnalytics } from "@/lib/observability/analytics/PerformanceAnalytics";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get("days") || "7");

        const heatmapData = await PerformanceAnalytics.getHeatmapData(days);

        return NextResponse.json(heatmapData);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
