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
        const result = await prisma.$queryRawUnsafe(`SELECT datname FROM pg_database WHERE datistemplate = false;`);
        console.log('DATABASES:', result);
    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
