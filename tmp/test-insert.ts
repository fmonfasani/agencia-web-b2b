import { prisma } from "../src/lib/prisma";

async function main() {
    console.log("--- Test de Inserción de Costo ---");

    try {
        const testTenant = await prisma.tenant.findFirst();
        if (!testTenant) {
            console.log("No hay tenants en la base de datos.");
            return;
        }

        console.log(`Usando Tenant: ${testTenant.name} (${testTenant.id})`);

        const newEvent = await prisma.apiCostEvent.create({
            data: {
                tenantId: testTenant.id,
                api: "openai",
                endpoint: "chat.completions",
                model: "gpt-4o-mini",
                tokensInput: 100,
                tokensOutput: 50,
                costUsd: 0.00015, // Test cost
                timestamp: new Date()
            }
        });

        console.log("¡Evento de costo creado exitosamente!");
        console.log(newEvent);

        const total = await prisma.apiCostEvent.count();
        console.log(`\nTotal de eventos en DB: ${total}`);

    } catch (error) {
        console.error("Error en el test:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
