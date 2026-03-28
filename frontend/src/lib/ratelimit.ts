import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Safe initialization: solo inicializa Redis si las variables de entorno están disponibles
function createRatelimit() {
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    // Si no hay Redis configurado, devolvemos un mock que siempre permite el tráfico
    return {
      limit: async (_identifier: string) => ({
        success: true,
        limit: 999,
        reset: 0,
        remaining: 999,
      }),
    } as unknown as Ratelimit;
  }

  return new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 intentos por minuto
    analytics: true,
    prefix: "@upstash/ratelimit/auth",
  });
}

export const ratelimit = createRatelimit();
