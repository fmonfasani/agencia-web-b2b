import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Iniciando script de carga de Revenue OS (JS Nativo)...");

  // 1. Obtener el Tenant (asumimos el default o el primero)
  let tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { name: "Agencia Leads Default" },
    });
  }

  const tenantId = tenant.id;

  // 2. Definir los 3 Colaboradores
  const collaborators = [
    { email: "luz.guffanti@agencia.com", role: "SALES" },
    { email: "fran.monfasani@agencia.com", role: "DEVELOPER" },
    { email: "agente.ai@agencia.com", role: "MANAGER" },
  ];

  console.log("👥 Creando usuarios y membresías...");

  for (const collab of collaborators) {
    // Crear o encontrar Usuario
    const user = await prisma.user.upsert({
      where: { email: collab.email },
      update: {},
      create: {
        email: collab.email,
        // Eliminado 'name' porque no existe en el modelo User actualmente
      },
    });

    // Crear Membresía en el Tenant
    await prisma.membership.upsert({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId: tenantId,
        },
      },
      update: { role: collab.role, status: "ACTIVE" },
      create: {
        userId: user.id,
        tenantId: tenantId,
        role: collab.role,
        status: "ACTIVE",
      },
    });

    console.log(`✅ Usuario configurado: ${collab.email}`);

    // --- DATOS DE IMPACTO ---

    console.log(`📈 Generando datos de impacto para ${collab.email}...`);

    // A. Actividades Recientes
    await prisma.activity.createMany({
      data: [
        {
          userId: user.id,
          tenantId: tenantId,
          type: collab.role === "SALES" ? "CALL_COMPLETED" : "TASK_DELIVERED",
          impact: collab.role === "SALES" ? 8.5 : 9.0,
          metadata: { detail: "Actividad generada por script de simulación" },
        },
        {
          userId: user.id,
          tenantId: tenantId,
          type: collab.role === "SALES" ? "DEAL_CLOSED" : "DEPLOY_SUCCESS",
          impact: 10.0,
          metadata: { detail: "Impacto crítico en el margen" },
        },
      ],
    });

    // B. Tareas Operativas
    await prisma.task.create({
      data: {
        userId: user.id,
        tenantId: tenantId,
        title:
          collab.role === "SALES"
            ? "Seguimiento Lead Premium"
            : "Refactor Core Engine",
        status: "IN_PROGRESS",
        priority: "HIGH",
        estimatedHours: 4,
      },
    });

    // C. Métricas Diarias (Para el Ranking de Impacto)
    await prisma.userDailyMetrics.upsert({
      where: {
        userId_tenantId_date: {
          userId: user.id,
          tenantId: tenantId,
          date: new Date(),
        },
      },
      update: {
        revenueGenerated: collab.role === "SALES" ? 4500 : 0,
        tasksCompleted: collab.role === "SALES" ? 5 : 12,
        impactScore: 9.2,
      },
      create: {
        userId: user.id,
        tenantId: tenantId,
        date: new Date(),
        revenueGenerated: collab.role === "SALES" ? 4500 : 0,
        tasksCompleted: collab.role === "SALES" ? 5 : 12,
        impactScore: 9.2,
      },
    });
  }

  console.log("✨ Simulación de Revenue OS completada con éxito.");
}

main()
  .catch((e) => {
    console.error("❌ Error ejecutando el script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
