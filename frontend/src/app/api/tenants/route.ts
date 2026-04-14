import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberships = await prisma.membership.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      include: { tenant: true },
      orderBy: { createdAt: "desc" },
    });

    if (memberships.length === 0) {
      return NextResponse.json({ error: "No tenant memberships found" }, { status: 403 });
    }

    const requestedTenant = request.nextUrl.searchParams.get("tenantId");
    const activeTenantId = requestedTenant || user.tenantId || memberships[0].tenantId;

    const hasAccess = memberships.some((membership) => membership.tenantId === activeTenantId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenants = memberships.map((membership) => ({
      id: membership.tenant.id,
      name: membership.tenant.name,
      status: membership.tenant.status,
      role: membership.role,
      onboardingDone: membership.tenant.onboardingDone,
    }));

    return NextResponse.json({ activeTenantId, tenants });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
