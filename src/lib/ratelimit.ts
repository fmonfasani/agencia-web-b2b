import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Configuración de Rate Limit con Upstash Redis
export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 intentos por minuto
  analytics: true,
  prefix: "@upstash/ratelimit/auth",
});
