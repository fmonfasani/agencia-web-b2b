import { prisma } from "../src/lib/prisma";

async function testFinOpsLogic() {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    console.log("--- Test de Lógica FinOps ---");

    try {
        const events = await prisma.apiCostEvent.findMany({
            where: {
                timestamp: {
                    gte: startOfMonth
                }
            }
        })

        const byTenant: Record<string, number> = {}
        const byApi: Record<string, number> = {}

        let total = 0

        for (const e of events) {
            total += e.costUsd
            byTenant[e.tenantId] = (byTenant[e.tenantId] || 0) + e.costUsd
            byApi[e.api] = (byApi[e.api] || 0) + e.costUsd
        }

        console.log("Resumen del Mes:");
        console.log(`- Costo Total: $${total.toFixed(4)}`);
        console.log("- Por API:", byApi);
        console.log("- Por Tenant:", byTenant);

        const now = new Date()
        const day = now.getDate()
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        const projection = (total / day) * daysInMonth

        console.log(`- Proyección a fin de mes: $${projection.toFixed(4)}`);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

testFinOpsLogic();
