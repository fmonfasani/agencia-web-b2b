import { prisma } from "../src/lib/prisma";

async function main() {
    console.log("--- Verificando Logs de Costos (ApiCostEvent) ---");

    try {
        const count = await prisma.apiCostEvent.count();
        console.log(`Total de registros: ${count}`);

        if (count > 0) {
            const latest = await prisma.apiCostEvent.findMany({
                take: 5,
                orderBy: { timestamp: 'desc' },
                include: {
                    tenant: {
                        select: { name: true }
                    }
                }
            });

            console.log("\nÚltimos 5 eventos:");
            latest.forEach((e, i) => {
                console.log(`${i + 1}. [${e.timestamp.toISOString()}] ${e.api} - ${e.endpoint} - Tenant: ${e.tenant?.name || e.tenantId} - Costo: $${e.costUsd.toFixed(4)}`);
            });
        } else {
            console.log("\nNo se encontraron registros de costos aún. Esto es normal si no se han hecho llamadas a las APIs desde la refactorización.");

            // Intentar insertar un registro de prueba para validar que la tabla existe y funciona
            /*
            const testTenant = await prisma.tenant.findFirst();
            if (testTenant) {
              console.log(`\nInsertando registro de prueba para tenant: ${testTenant.name}...`);
              await prisma.apiCostEvent.create({
                data: {
                  tenantId: testTenant.id,
                  api: "test",
                  endpoint: "test.check",
                  costUsd: 0.0001,
                }
              });
              console.log("¡Registro de prueba insertado con éxito!");
            }
            */
        }
    } catch (error) {
        console.error("Error al consultar la base de datos:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
