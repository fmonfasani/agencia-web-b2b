import { NextRequest, NextResponse } from "next/server";

const AUDITOR_API_URL = process.env.AUDITOR_API_URL || "http://localhost:8001";

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

        // If no ID, we might want to list recent audits from DB
        // For now, let's assume we return an empty list or fetch from Prisma directly
        const { prisma } = await import("@/lib/prisma");
        const audits = await prisma.audit.findMany({
            orderBy: { createdAt: "desc" },
            take: 10
        });
        return NextResponse.json(audits);
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
            body: JSON.stringify(body)
        });

        if (!res.ok) throw new Error("Failed to start audit");
        const data = await res.json();
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
