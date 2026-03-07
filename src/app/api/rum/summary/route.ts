import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RumSummaryRow = {
  page: string;
  metric: string;
  count: bigint;
  p50: number | null;
  p75: number | null;
  p95: number | null;
};

export async function GET() {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const rows = await prisma.$queryRaw<RumSummaryRow[]>`
      SELECT
        "page",
        "metric",
        COUNT(*) AS "count",
        percentile_cont(0.50) WITHIN GROUP (ORDER BY "value") AS "p50",
        percentile_cont(0.75) WITHIN GROUP (ORDER BY "value") AS "p75",
        percentile_cont(0.95) WITHIN GROUP (ORDER BY "value") AS "p95"
      FROM "RumEvent"
      WHERE "createdAt" >= ${since}
      GROUP BY "page", "metric"
      ORDER BY "page" ASC, "metric" ASC
    `;

    const summary = rows.map((row) => ({
      page: row.page,
      metric: row.metric,
      count: Number(row.count),
      p50: row.p50 ?? 0,
      p75: row.p75 ?? 0,
      p95: row.p95 ?? 0,
    }));

    return NextResponse.json(summary);
  } catch (error) {
    console.error("RUM: Failed to get summary", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
