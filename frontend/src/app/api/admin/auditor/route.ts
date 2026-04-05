import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/handle-api-error";
import { z } from "zod";

const AUDITOR_API_URL = process.env.AUDITOR_API_URL || "http://localhost:8001";

// Validation schemas
const getAuditSchema = z.object({
  id: z.string().cuid().optional().nullable(),
});

const startAuditSchema = z.object({
  scope: z.string().min(1).max(500).optional(),
  depth: z.enum(["shallow", "standard", "deep"]).optional(),
  includeTests: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const auditId = searchParams.get("id");

  try {
    // Validate input
    const validation = getAuditSchema.safeParse({ id: auditId });
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid audit ID format" },
        { status: 400 },
      );
    }

    if (auditId) {
      const res = await fetch(`${AUDITOR_API_URL}/audit/${auditId}`);
      if (!res.ok) throw new Error("Auditor service error");
      const data = await res.json();
      return NextResponse.json(data);
    }

    // If no ID, we might want to list recent audits from DB
    // For now, let's assume we return an empty list or fetch from Prisma directly
    const { prisma } = await import("@/lib/prisma");
    const audits = await prisma.audit.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    return NextResponse.json(audits);
  } catch (error) {
    const { message, status } = handleApiError(
      error,
      "Failed to fetch audits",
      { auditId },
    );
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input
    const validation = startAuditSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid audit configuration",
          details: validation.error.flatten(),
        },
        { status: 400 },
      );
    }

    const res = await fetch(`${AUDITOR_API_URL}/audit/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validation.data),
    });

    if (!res.ok) throw new Error("Failed to start audit");
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    const { message, status } = handleApiError(error, "Failed to start audit");
    return NextResponse.json({ error: message }, { status });
  }
}
