import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MONTHLY_BUDGET = 4.9;

export async function GET() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  try {
    const events = await prisma.apiCostEvent.findMany({
      where: {
        timestamp: {
          gte: startOfMonth,
        },
      },
    });

    const byTenant: Record<string, number> = {};
    const byApi: Record<string, number> = {};

    let total = 0;

    for (const e of events) {
      total += e.costUsd;

      byTenant[e.tenantId] = (byTenant[e.tenantId] || 0) + e.costUsd;

      byApi[e.api] = (byApi[e.api] || 0) + e.costUsd;
    }

    const now = new Date();
    const day = now.getDate();
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();

    const projection = (total / day) * daysInMonth;

    const alerts = [];

    if (projection >= MONTHLY_BUDGET * 0.8) {
      alerts.push(
        `Projected cost ($${projection.toFixed(2)}) exceeds 80% of monthly budget ($${MONTHLY_BUDGET})`,
      );
    }

    if (total >= MONTHLY_BUDGET) {
      alerts.push("CRITICAL: Monthly budget already exceeded");
    }

    const recentLogs = await prisma.apiCostEvent.findMany({
      take: 10,
      orderBy: { timestamp: "desc" },
      include: {
        tenant: {
          select: { name: true },
        },
      },
    });

    // Check for Apify 402 errors in any relevant logs or business metrics
    const businessMetricModel = (prisma as any).businessMetric;

    let apifyBillingError = null;
    let googleAuthError = null;

    if (businessMetricModel) {
      apifyBillingError = await businessMetricModel.findFirst({
        where: {
          type: "EXTRACTION_FAILURE",
          metadata: {
            path: ["error"],
            string_contains: "402",
          },
        },
      });

      if (apifyBillingError) {
        alerts.push(
          "URGENTE: Error de pago en Apify (402 Payment Required). El scraping está detenido.",
        );
      }

      googleAuthError = await businessMetricModel.findFirst({
        where: {
          type: "EXTRACTION_FAILURE",
          metadata: {
            path: ["error"],
            string_contains: "GOOGLE_AUTH_ERROR",
          },
        },
      });

      if (googleAuthError) {
        alerts.push(
          "CRITICO: Error 403 en Google Maps. Revisa las restricciones de tu API Key o cuotas.",
        );
      }
    }

    // Business SLIs (Last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const metrics = businessMetricModel
      ? ((await businessMetricModel.findMany({
          where: {
            timestamp: { gte: sevenDaysAgo },
          },
        })) as any[])
      : [];

    const successCount = metrics.filter(
      (m: any) => m.type === "EXTRACTION_SUCCESS" && m.status === "SUCCESS",
    ).length;
    const totalExtraction = metrics.filter(
      (m: any) => m.type === "EXTRACTION_SUCCESS",
    ).length;
    const successRate =
      totalExtraction > 0 ? (successCount / totalExtraction) * 100 : 100;

    const latencies = metrics
      .filter((m: any) => m.type === "EXTRACTION_LATENCY" && m.value !== null)
      .map((m: any) => m.value as number);
    const avgLatency =
      latencies.length > 0
        ? latencies.reduce((a: number, b: number) => a + b, 0) /
          latencies.length
        : 0;
    /* eslint-enable @typescript-eslint/no-explicit-any */

    return NextResponse.json({
      total_month_cost: total,
      by_tenant: byTenant,
      by_api: byApi,
      projection_end_month: projection,
      budget: MONTHLY_BUDGET,
      alerts,
      recent_logs: recentLogs,
      sli: {
        success_rate: successRate,
        avg_latency: avgLatency,
        extraction_count: totalExtraction,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
