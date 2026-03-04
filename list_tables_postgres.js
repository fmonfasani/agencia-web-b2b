const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'postgresql://postgres:%23Karaoke27570Echeverria@134.209.41.51:5432/postgres?sslmode=disable'
        }
    }
});

async function main() {
    try {
        const tables = await prisma.$queryRawUnsafe(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`);
        console.log('TABLES_IN_POSTGRES:', tables);
    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
