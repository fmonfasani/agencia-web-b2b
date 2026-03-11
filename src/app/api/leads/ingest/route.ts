/**
 * POST /api/leads/ingest
 * Endpoint interno usado por el agent-service (VPS) para guardar leads scrapeados.
 * Autentica con X-Internal-Secret o x-admin-secret.
 * Deduplica por googlePlaceId (único) o nombre+tenantId.
 */
import { NextRequest, NextResponse } from "next/server";
import { withSpan } from "@/lib/observability/tracing";
import { incrementCounter } from "@/lib/observability/metrics";
import { info, error as logError } from "@/lib/observability/logger";
import { BridgeClient } from "@/lib/bridge-client";
import { validateInternalSecret } from "@/lib/api-auth";

function resolveTenantId(req: NextRequest): string | null {
  return req.headers.get("x-tenant-id") ?? req.headers.get("x-tenant") ?? null;
}

export async function POST(req: NextRequest) {
  return withSpan("api.leads.ingest", async (span) => {
    // Auth
    if (!validateInternalSecret(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Missing X-Tenant-Id header" },
        { status: 400 },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const name = body.name as string | undefined;
    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 },
      );
    }

    span.setAttributes({ "lead.name": name, "tenant.id": tenantId });

    const googlePlaceId = body.googlePlaceId as string | undefined;
    const website =
      (body.website as string | undefined)?.substring(0, 500) ?? null;
    const score =
      (body.potentialScore as number | undefined) ??
      (body.rating
        ? Math.min(100, Math.round((body.rating as number) * 20))
        : 80);

    try {
      // Deduplicar usando el Bridge
      const existing = await BridgeClient.query("lead", "findFirst", {
        where: googlePlaceId ? { tenantId, googlePlaceId } : { tenantId, name },
        select: { id: true },
      });

      if (existing) {
        incrementCounter("lead.ingest.skipped", {
          reason: "duplicate",
          tenantId,
        });
        return NextResponse.json(
          { status: "skipped", reason: "duplicate", id: existing.id },
          { status: 200 },
        );
      }

      const lead = await BridgeClient.query("lead", "create", {
        data: {
          tenantId,
          name,
          companyName: name,
          email: (body.email as string | undefined) ?? null,
          phone: (body.phone as string | undefined) ?? null,
          website,
          address: (body.address as string | undefined) ?? null,
          description:
            (body.category as string | undefined) ??
            (body.description as string | undefined) ??
            null,
          sourceType: "SCRAPER",
          status: "NEW",
          potentialScore: score,
          googlePlaceId: googlePlaceId ?? null,
          googleMapsUrl: (body.googleMapsUrl as string | undefined) ?? null,
          rawMetadata: body.rawMetadata ?? body,
          instagram: (body.instagram as string | undefined) ?? null,
          facebook: (body.facebook as string | undefined) ?? null,
          whatsapp: (body.whatsapp as string | undefined) ?? null,
          linkedin: (body.linkedin as string | undefined) ?? null,
          tiktok: (body.tiktok as string | undefined) ?? null,
        },
        select: { id: true, name: true },
      });

      await incrementCounter("lead.ingest.success", { tenantId });
      await info(`Lead ingested via Bridge: ${name}`, {
        leadId: lead.id,
        tenantId,
      });

      return NextResponse.json(
        { status: "created", id: lead.id, name: lead.name },
        { status: 201 },
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      await logError(`Ingest failure (Bridge): ${msg}`, { tenantId, name });
      span.recordException(e as Error);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  });
}
