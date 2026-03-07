import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { AuthorizationError, requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { requireInternalSecret } from "@/lib/api-auth";

export async function GET(request: Request) {
    try {
        requireInternalSecret(request);
    } catch {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    try {
        await requireRole(["ADMIN", "SUPER_ADMIN"] as Role[]);

        const traces = await prisma.trace.findMany({
            orderBy: { createdAt: "desc" },
            take: 50,
        });

        return NextResponse.json({
            success: true,
            traces,
        });
    } catch (error) {
        if (error instanceof AuthorizationError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("[Observability:Traces] GET error:", error);
        return NextResponse.json({ error: "Failed to fetch traces" }, { status: 500 });
    }
}
