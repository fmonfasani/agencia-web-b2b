import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { AuthorizationError, requireRole } from "@/lib/authz";
import { BridgeClient } from "@/lib/bridge-client";

export async function POST(request: NextRequest) {
    const internalSecret = request.headers.get("x-internal-secret");
    const sharedSecret = process.env.INTERNAL_API_SECRET || "";

    if (!internalSecret || internalSecret !== sharedSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { cpuUsage, memUsage, diskUsage, netIn, netOut } = body;

        const metric = await BridgeClient.query("vpsMetric", "create", {
            data: {
                cpuUsage: parseFloat(cpuUsage),
                memUsage: parseFloat(memUsage),
                diskUsage: parseFloat(diskUsage),
                netIn: netIn ? parseFloat(netIn) : null,
                netOut: netOut ? parseFloat(netOut) : null,
            }
        });

        return NextResponse.json({ success: true, id: metric.id });
    } catch (error) {
        console.error("Error ingesting VPS metrics (Bridge):", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        await requireRole(["ADMIN", "SUPER_ADMIN"] as Role[]);
    } catch (error) {
        if (error instanceof AuthorizationError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "1h"; // 1h, 3h, 6h, 24h, 7d, 14d, 3m

    const timeFrom = new Date();
    switch (period) {
        case "1h": timeFrom.setHours(timeFrom.getHours() - 1); break;
        case "3h": timeFrom.setHours(timeFrom.getHours() - 3); break;
        case "6h": timeFrom.setHours(timeFrom.getHours() - 6); break;
        case "24h": timeFrom.setHours(timeFrom.getHours() - 24); break;
        case "7d": timeFrom.setDate(timeFrom.getDate() - 7); break;
        case "14d": timeFrom.setDate(timeFrom.getDate() - 14); break;
        case "3m": timeFrom.setMonth(timeFrom.getMonth() - 3); break;
        default: timeFrom.setHours(timeFrom.getHours() - 1);
    }

    try {
        const metrics = await BridgeClient.query("vpsMetric", "findMany", {
            where: {
                timestamp: {
                    gte: timeFrom,
                },
            },
            orderBy: {
                timestamp: "asc",
            },
        });

        return NextResponse.json(metrics);
    } catch (error) {
        console.error("Error fetching VPS metrics (Bridge):", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
