import { NextRequest, NextResponse } from "next/server";
import { AppointmentType } from "@prisma/client";
import { AppointmentsService } from "@/lib/appointments/appointments.service";
import { getTenantPrisma } from "@/lib/prisma";
import { requireTenantId, TenantContextError } from "@/lib/tenant-context";

function resolveTenantId(req: NextRequest): string {
  return requireTenantId(req.headers.get("x-tenant-id"));
}

export async function GET(req: NextRequest) {
  let tenantId: string;
  try {
    tenantId = resolveTenantId(req);
  } catch (error) {
    const message =
      error instanceof TenantContextError ? error.message : "Missing tenantId";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const filter = new URL(req.url).searchParams.get("filter") ?? "all";
  const tPrisma = getTenantPrisma(tenantId);

  try {
    if (filter === "upcoming") {
      const appointments = await AppointmentsService.getUpcoming(tenantId);
      return NextResponse.json({ count: appointments.length, appointments });
    }

    if (filter === "today") {
      const now = new Date();
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);

      const appointments = await tPrisma.appointment.findMany({
        where: {
          scheduledAt: { gte: start, lte: end },
        },
        include: {
          lead: {
            select: { id: true, name: true, companyName: true },
          },
        },
        orderBy: { scheduledAt: "asc" },
      });
      return NextResponse.json({ count: appointments.length, appointments });
    }

    const appointments = await tPrisma.appointment.findMany({
      include: {
        lead: {
          select: { id: true, name: true, companyName: true },
        },
      },
      orderBy: { scheduledAt: "asc" },
      take: 200,
    });
    return NextResponse.json({ count: appointments.length, appointments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let tenantId: string;
  try {
    tenantId = resolveTenantId(req);
  } catch (error) {
    const message =
      error instanceof TenantContextError ? error.message : "Missing tenantId";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Body is required." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const leadId = typeof payload.leadId === "string" ? payload.leadId : null;
  const scheduledAt = payload.scheduledAt;
  const duration =
    typeof payload.duration === "number" ? payload.duration : undefined;
  const notes = typeof payload.notes === "string" ? payload.notes : undefined;
  const type = typeof payload.type === "string" ? payload.type : undefined;

  if (
    !leadId ||
    (typeof scheduledAt !== "string" && !(scheduledAt instanceof Date))
  ) {
    return NextResponse.json(
      { error: "Body must include leadId and scheduledAt." },
      { status: 400 },
    );
  }

  if (
    type &&
    !Object.values(AppointmentType).includes(type as AppointmentType)
  ) {
    return NextResponse.json(
      { error: `Invalid appointment type '${type}'.` },
      { status: 400 },
    );
  }

  try {
    const appointment = await AppointmentsService.createAppointment({
      tenantId,
      headers: req.headers,
      leadId,
      scheduledAt,
      duration,
      notes,
      type: type as AppointmentType | undefined,
    });
    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
