import { NextRequest, NextResponse } from "next/server";

const AUDITOR_API_URL = process.env.AUDITOR_API_URL || "http://localhost:8001";
const SAAS_URL = () =>
  process.env.NEXT_PUBLIC_SAAS_API_URL || "http://localhost:8000";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const auditId = searchParams.get("id");

  try {
    if (auditId) {
      const res = await fetch(`${AUDITOR_API_URL}/audit/${auditId}`);
      if (!res.ok) throw new Error("Auditor service error");
      const data = await res.json();
      return NextResponse.json(data);
    }

    // Fetch audit events from backend-saas
    const resp = await fetch(`${SAAS_URL()}/audit/events?limit=10`);
    if (!resp.ok) {
      return NextResponse.json([], { status: 200 });
    }
    const audits = await resp.json().catch(() => []);
    return NextResponse.json(Array.isArray(audits) ? audits : []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${AUDITOR_API_URL}/audit/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error("Failed to start audit");
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
