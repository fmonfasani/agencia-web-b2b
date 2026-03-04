const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'postgres://postgres.hdognvwfqfdeewjuqsdc:9Oa7d7fxahW7i6At@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require'
        }
    }
});

async function main() {
    try {
        const userCount = await prisma.user.count();
        const leadCount = await prisma.lead.count();
        const tenantCount = await prisma.tenant.count();
        console.log('SUPABASE_STATS:', { userCount, leadCount, tenantCount });
    } catch (e) {
        console.error('SUPABASE_ERROR:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
