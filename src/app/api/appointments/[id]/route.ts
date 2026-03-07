import { NextRequest, NextResponse } from "next/server";
import { AppointmentStatus } from "@prisma/client";
import { AppointmentsService } from "@/lib/appointments/appointments.service";
import { getTenantPrisma } from "@/lib/prisma";
import { requireTenantId, TenantContextError } from "@/lib/tenant-context";

function parseStatus(value: unknown): AppointmentStatus | null {
  if (typeof value !== "string") return null;
  return Object.values(AppointmentStatus).includes(value as AppointmentStatus)
    ? (value as AppointmentStatus)
    : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let tenantId: string;
  try {
    tenantId = requireTenantId(req.headers.get("x-tenant-id"));
  } catch (error) {
    const message = error instanceof TenantContextError ? error.message : "Missing tenantId";
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
  const status = parseStatus(payload.status);
  const outcome = typeof payload.outcome === "string" ? payload.outcome : undefined;

  if (status === AppointmentStatus.COMPLETED && outcome) {
    try {
      const updated = await AppointmentsService.completeAppointment(tenantId, id, outcome);
      return NextResponse.json(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const tPrisma = getTenantPrisma(tenantId);
  try {
    const updated = await tPrisma.appointment.update({
      where: { id },
      data: {
        status: status ?? undefined,
        outcome: outcome ?? undefined,
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let tenantId: string;
  try {
    tenantId = requireTenantId(req.headers.get("x-tenant-id"));
  } catch (error) {
    const message = error instanceof TenantContextError ? error.message : "Missing tenantId";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const tPrisma = getTenantPrisma(tenantId);
  try {
    const updated = await tPrisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CANCELLED },
    });
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
