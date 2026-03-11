/* eslint-disable @typescript-eslint/no-require-imports */
const fastify = require("fastify")({ logger: true });
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// CONFIGURACIÓN DE SEGURIDAD
const BRIDGE_API_KEY = process.env.BRIDGE_API_KEY;
const NEXTJS_INTERNAL_AUTH_URL = process.env.NEXTJS_INTERNAL_AUTH_URL; // e.g. https://agencia-web-b2b.vercel.app/api/auth/internal
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

if (!BRIDGE_API_KEY || !NEXTJS_INTERNAL_AUTH_URL || !INTERNAL_API_SECRET) {
  console.error(
    "FATAL: BRIDGE_API_KEY, NEXTJS_INTERNAL_AUTH_URL o INTERNAL_API_SECRET no definidas.",
  );
  process.exit(1);
}

// Middleware de Autenticación
fastify.addHook("preHandler", async (request, reply) => {
  const apiKey = request.headers["x-bridge-key"];

  // 1. Validar la llave del bridge (estática)
  if (!apiKey || apiKey !== BRIDGE_API_KEY) {
    return reply
      .code(401)
      .send({ error: "No autorizado: Llave de seguridad inválida." });
  }

  // 2. Opcional: Validar contra el API de Next.js (Doble factor de seguridad interna)
  try {
    const response = await fetch(NEXTJS_INTERNAL_AUTH_URL, {
      headers: {
        Authorization: `Bearer ${INTERNAL_API_SECRET}`,
      },
    });

    if (!response.ok) {
      return reply
        .code(401)
        .send({
          error: "No autorizado: Error de validación interna con Next.js.",
        });
    }
  } catch (error) {
    fastify.log.error("Error validando con Next.js:", error);
    // Podríamos permitir pasar si Next.js está caído pero el Bridge Key es correcto?
    // Por ahora exigimos que Next.js responda para máxima seguridad.
    return reply
      .code(503)
      .send({ error: "Servicio de autenticación no disponible." });
  }
});

// ENDPOINT: Health Check
fastify.get("/health", async () => {
  return { status: "ok", database: "connected" };
});

// ENDPOINT: Proxy genérico para Prisma (Solo para uso interno Agencia)
// Esto permite ejecutar comandos de Prisma remotos de forma segura
fastify.post("/query", async (request, reply) => {
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
    await fastify.listen({ port: 3001, host: "0.0.0.0" });
    console.log(`Puerto Seguro abierto en localhost:3001`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
