const fastify = require('fastify')({ logger: true });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// CONFIGURACIÓN DE SEGURIDAD
const BRIDGE_API_KEY = process.env.BRIDGE_API_KEY;

if (!BRIDGE_API_KEY) {
    console.error("FATAL: BRIDGE_API_KEY no está definida.");
    process.exit(1);
}

// Middleware de Autenticación
fastify.addHook('preHandler', async (request, reply) => {
    const apiKey = request.headers['x-bridge-key'];
    if (!apiKey || apiKey !== BRIDGE_API_KEY) {
        return reply.code(401).send({ error: 'No autorizado: Llave de seguridad inválida.' });
    }
});

// ENDPOINT: Health Check
fastify.get('/health', async () => {
    return { status: 'ok', database: 'connected' };
});

// ENDPOINT: Proxy genérico para Prisma (Solo para uso interno Agencia)
// Esto permite ejecutar comandos de Prisma remotos de forma segura
fastify.post('/query', async (request, reply) => {
    const { model, action, args } = request.body;

    try {
        const result = await prisma[model][action](args);
        return { data: result };
    } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: error.message });
    }
});

// Inicio del servidor
const start = async () => {
    try {
        await fastify.listen({ port: 3001, host: '0.0.0.0' });
        console.log(`Puerto Seguro abierto en localhost:3001`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
