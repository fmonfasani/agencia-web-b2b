import { SaaSLogger } from "./src/lib/observability/logger";
import crypto from "crypto";

/**
 * Script de prueba para validar el blindaje de observabilidad.
 * Simula peticiones en un entorno distribuido.
 */

async function testObservability() {
    console.log("--- INICIANDO TEST DE OBSERVABILIDAD ---\n");

    const mockTraceId = crypto.randomUUID();
    const mockTenantId = "tenant-meli-123";
    const mockUserId = "user-fede-456";

    const context = {
        traceId: mockTraceId,
        tenantId: mockTenantId,
        userId: mockUserId,
        requestId: `req-${Date.now()}`
    };

    // 1. Test Info Log
    SaaSLogger.info("Intento de ejecución de Scraper iniciado", context, {
        query: "Software Factories",
        region: "LATAM"
    });

    // 2. Test Error Log
    try {
        throw new Error("Conexión con Google Places API fallida (Timeout 5000ms)");
    } catch (err: any) {
        SaaSLogger.error("Error crítico en motor de búsqueda", context, {
            error: err.message,
            retryCount: 3
        });
    }

    // 3. Test Business Event Log
    await SaaSLogger.business(
        "Nuevo Lead capturado vía Scraper",
        mockTenantId,
        "LEAD_CAPTURED",
        { leadId: "lead-999", score: 85 }
    );

    console.log("\n--- TEST FINALIZADO: Revisar el output JSON arriba ---");
}

testObservability().catch(console.error);
