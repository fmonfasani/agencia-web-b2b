import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Probrando conexión a DB...");

  // Crear un lead de prueba
  const lead = await prisma.lead.create({
    data: {
      email: "test@example.com",
      name: "Test User",
      message: "Esto es una prueba de SQLite",
      company: "Test Corp",
      budget: "range_2",
    },
  });

  console.log("Lead creado:", lead);

  // Leer leads
  const count = await prisma.lead.count();
  console.log(`Total de leads en DB: ${count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
