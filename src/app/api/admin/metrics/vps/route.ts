import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { cpuUsage, memUsage, diskUsage, netIn, netOut } = body;

        const metric = await prisma.vpsMetric.create({
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
        console.error("Error ingesting VPS metrics:", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
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
        const metrics = await prisma.vpsMetric.findMany({
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
        console.error("Error fetching VPS metrics:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
