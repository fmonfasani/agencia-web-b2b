import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthorizationError, requireRoleForRequest } from "@/lib/authz";

const ALLOWED_LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "CONVERTED",
  "LOST",
] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    requireRoleForRequest(request, ["OWNER", "ADMIN", "SALES"]);

    const body = await request.json();
    const status = String(body?.status || "").toUpperCase();

    if (
      !ALLOWED_LEAD_STATUSES.includes(
        status as (typeof ALLOWED_LEAD_STATUSES)[number],
      )
    ) {
      return NextResponse.json(
        { error: "Invalid lead status" },
        { status: 400 },
      );
    }

    const { id } = await params;

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: { status },
      select: { id: true, status: true, updatedAt: true },
    });

    return NextResponse.json({ success: true, lead: updatedLead });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: "Failed to update lead status" },
      { status: 500 },
    );
  }
}
