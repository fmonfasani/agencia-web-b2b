import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding plans...');

  const plans = [
    {
      code: 'STARTER',
      name: 'Starter',
      description: 'Perfecto para emprender',
      price: 19900,
      priceARS: 19900,
      priceUSD: 99,
      currency: 'ARS',
      interval: 'month',
      limits: {
        maxAgents: 1,
        maxUsers: 3,
        maxLeads: 100,
        maxDeals: 50,
      },
      features: [
        'CRM Básico',
        '1 Agente IA',
        'Hasta 3 usuarios',
        '100 leads/mes',
        'Soporte por email',
      ],
      maxAgents: 1,
      maxUsers: 3,
      maxLeads: 100,
      maxDeals: 50,
      active: true,
    },
    {
      code: 'PRO',
      name: 'Professional',
      description: 'Para equipos en crecimiento',
      price: 39900,
      priceARS: 39900,
      priceUSD: 199,
      currency: 'ARS',
      interval: 'month',
      limits: {
        maxAgents: 3,
        maxUsers: 10,
        maxLeads: 500,
        maxDeals: 200,
      },
      features: [
        'CRM Avanzado',
        '3 Agentes IA',
        'Hasta 10 usuarios',
        '500 leads/mes',
        'Scraping ilimitado',
        'Soporte prioritario',
        'Reportes avanzados',
      ],
      maxAgents: 3,
      maxUsers: 10,
      maxLeads: 500,
      maxDeals: 200,
      active: true,
    },
    {
      code: 'ENTERPRISE',
      name: 'Enterprise',
      description: 'Solución completa para grandes equipos',
      price: 79900,
      priceARS: 79900,
      priceUSD: 399,
      currency: 'ARS',
      interval: 'month',
      limits: {
        maxAgents: 10,
        maxUsers: 50,
        maxLeads: 2000,
        maxDeals: 1000,
      },
      features: [
        'CRM Enterprise',
        '10 Agentes IA',
        'Usuarios ilimitados',
        'Leads ilimitados',
        'Scraping ilimitado',
        'Soporte 24/7',
        'Onboarding dedicado',
        'API access',
        'White-label',
      ],
      maxAgents: 10,
      maxUsers: 50,
      maxLeads: 2000,
      maxDeals: 1000,
      active: true,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        description: plan.description,
        price: plan.price,
        priceARS: plan.priceARS,
        priceUSD: plan.priceUSD,
        currency: plan.currency,
        interval: plan.interval,
        limits: plan.limits,
        features: plan.features,
        maxAgents: plan.maxAgents,
        maxUsers: plan.maxUsers,
        maxLeads: plan.maxLeads,
        maxDeals: plan.maxDeals,
        active: plan.active,
      },
      create: plan,
    });
    console.log(`✅ Upserted plan: ${plan.name} (ARS ${plan.priceARS.toLocaleString()})`);
  }

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
