import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/request-auth";
import { logAuditEvent } from "@/lib/security/audit";
import { SaaSLogger } from "@/lib/observability/logger";

export async function POST(request: NextRequest) {
    try {
        const auth = await requireAuth();
        if (!auth) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const tenantId = auth.session.tenantId;
        if (!tenantId) {
            return NextResponse.json({ error: "Contexto de tenant no encontrado" }, { status: 400 });
        }

        const { instanceName, industry, targetRegion, dailyGoal } = await request.json();

        // Actualizar el Tenant con la configuración inicial
        await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                name: instanceName || undefined,
                onboardingDone: true,
                // Guardar metadata extendida en rawMetadata si fuera necesario
            },
        });

        await SaaSLogger.business(
            "Tenant finalizó el onboarding guíado",
            tenantId,
            "ONBOARDING_COMPLETED",
            { industry, targetRegion, dailyGoal, instanceName }
        );

        // Registrar evento de negocio
        await prisma.businessEvent.create({
            data: {
                tenantId,
                type: "ONBOARDING_COMPLETED",
                payload: { industry, targetRegion, dailyGoal, instanceName },
                source: "system",
            },
        });

        await logAuditEvent({
            eventType: "ONBOARDING_COMPLETED",
            userId: auth.user.id,
            tenantId,
            metadata: { industry, instanceName },
        });

        return NextResponse.json({ success: true, message: "Onboarding completado con éxito" });
    } catch (error) {
        console.error("ONBOARDING_API_ERROR:", error);
        return NextResponse.json(
            { error: "Error interno al procesar el onboarding" },
            { status: 500 }
        );
    }
}
