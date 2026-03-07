import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const { auth } = NextAuth(authConfig);

// Create ratelimiter if env variables are present
let ratelimit: Ratelimit | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(50, "10 s"), // 50 requests per 10 seconds per IP
    analytics: true,
  });
}

const intlMiddleware = createMiddleware(routing);

export default auth(async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";

  // 1. Rate Limiting (Production only safety)
  if (ratelimit && pathname.startsWith("/api/")) {
    const { success, limit, reset, remaining } = await ratelimit.limit(ip);
    if (!success) {
      return new NextResponse("Demasiadas solicitudes. Por favor, intenta de nuevo más tarde.", {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      });
    }
  }

  // 1b. IGNORAR rutas de Auth y archivos internos (Movido después de Rate Limit para proteger APIs)
  if (
    pathname.includes("/auth/") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // 2. Request Correlation (SRE Trace ID)
  const traceId = request.headers.get("x-trace-id") || crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-trace-id", traceId);

  // 3. Inyectar contexto de Tenant
  // @ts-expect-error NextAuth v5 dynamically adds auth to the request
  const session = request.auth;
  if (session?.user?.tenantId) {
    requestHeaders.set("x-tenant-id", session.user.tenantId);
    requestHeaders.set("x-user-role", session.user.role || "");
  }

  // 4. Ejecutar el middleware de idiomas
  const response = intlMiddleware(request);

  // 5. Inyectar cabeceras en la respuesta
  if (session?.user?.tenantId) {
    response.headers.set("x-tenant-id", session.user.tenantId);
    response.headers.set("x-user-role", session.user.role || "");
  }

  // Security Headers
  response.headers.set("X-Trace-Id", traceId);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );

  return response;
});

export const config = {
  // Matcher que incluye la raíz y las rutas localizadas, excluyendo estáticos y APIs
  matcher: [
    "/",
    "/(es|en)/:path*",
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
