import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    console.log('🚀 Remote: Iniciando Test de Pipeline');

    // 1. Inyectar/Resetar Lead
    console.log('📝 Preparando lead: test@vestadental.com');
    const leadData: any = {
        name: 'Vesta Dental Test',
        email: 'test@vestadental.com',
        company: 'Vesta Dental Clinic',
        website: 'https://vestadental.com.ar',
        status: 'NUEVO',
        intelligence: null
    };

    const lead = await (prisma.lead as any).upsert({
        where: { email: 'test@vestadental.com' },
        update: leadData,
        create: leadData
    });

    console.log('✅ Lead listo con ID:', lead.id);

    // 2. Procesar Inteligencia
    console.log('⚡ Ejecutando Revenue OS Intelligence...');
    const { processRevenueIntelligence } = require('../src/lib/intelligence/revenue-os');
    await processRevenueIntelligence(lead.id);

    console.log('🎯 Test completado con éxito.');
}

run()
    .catch((err) => {
        console.error('❌ Error en el pipeline:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
