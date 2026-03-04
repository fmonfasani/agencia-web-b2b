const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'postgresql://postgres:%23Karaoke27570Echeverria@134.209.41.51:5432/agencia_web_b2b?sslmode=disable'
        }
    }
});

async function main() {
    try {
        const userCount = await prisma.user.count();
        const leadCount = await prisma.lead.count();
        const tenantCount = await prisma.tenant.count();
        const sessionCount = await prisma.session.count();
        console.log('DO_STATS:', { userCount, leadCount, tenantCount, sessionCount });
    } catch (e) {
        console.error('DO_ERROR:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
