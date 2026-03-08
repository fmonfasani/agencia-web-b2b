import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/request-auth";

const AGENT_SERVICE_URL =
  process.env.AGENT_SERVICE_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  const ADMIN_SECRET = process.env.ADMIN_SECRET || "";
  const auth = await requireAuth();
  if (!auth)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();

  try {
    const res = await fetch(`${AGENT_SERVICE_URL}/schedules/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": ADMIN_SECRET,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  const ADMIN_SECRET = process.env.ADMIN_SECRET || "";
  const auth = await requireAuth();
  if (!auth)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId");

  try {
    const res = await fetch(
      `${AGENT_SERVICE_URL}/schedules/?tenant_id=${tenantId || ""}`,
      {
        method: "GET",
        headers: {
          "x-admin-secret": ADMIN_SECRET,
        },
      },
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
