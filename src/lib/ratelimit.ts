import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Crear cliente de Redis
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Crear limitador de tasa: 10 mensajes cada 1 minuto por IP/Usuario
export const salesChatRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  analytics: true,
  prefix: "ratelimit:sales-chat",
});
