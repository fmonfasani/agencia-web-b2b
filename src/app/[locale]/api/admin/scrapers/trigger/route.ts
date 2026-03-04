import { NextRequest, NextResponse } from "next/server";
import { triggerGooglePlacesScrape } from "@/lib/scrapers/google-places";
import { requireAuth } from "@/lib/auth/request-auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
    try {
        const auth = await requireAuth();
        if (!auth || auth.user.role !== "ADMIN") {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const tenantId = auth.session.tenantId;
        if (!tenantId) {
            return NextResponse.json({ error: "Contexto de tenant no encontrado" }, { status: 400 });
        }

        const { query, location } = await request.json();

        if (!query) {
            return NextResponse.json({ error: "Query de búsqueda es requerida" }, { status: 400 });
        }

        // Registrar inicio de tarea de scraping
        await prisma.businessEvent.create({
            data: {
                tenantId,
                type: "SCRAPER_TRIGGERED",
                payload: { query, location },
                source: "api",
            },
        });

        const result = await triggerGooglePlacesScrape({
            tenantId,
            query,
            location,
        });

        return NextResponse.json({
            success: true,
            data: result,
            message: "Scraping iniciado y leads procesados exitosamente."
        });
    } catch (error: any) {
        console.error("SCRAPER_TRIGGER_ERROR:", error);
        return NextResponse.json(
            { error: "Error interno al disparar el scraper" },
            { status: 500 }
        );
    }
}
