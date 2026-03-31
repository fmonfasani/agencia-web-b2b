import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Inyectando lead de prueba: Vesta Dental Test');

    // Usar any para saltar errores de compilación de tipos si el schema no está sincronizado localmente
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

    console.log('✅ Lead creado/resetado con ID:', lead.id);
}

main()
    .catch((e) => {
        console.error('❌ Error inyectando lead:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
