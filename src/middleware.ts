import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const { auth } = NextAuth(authConfig);

let ratelimit: Ratelimit | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(50, "10 s"),
    analytics: true,
  });
}

const intlMiddleware = createMiddleware(routing);

export default auth(async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";

  if (ratelimit && (pathname.startsWith("/api/") || pathname.includes("/api/"))) {
    const { success, limit, reset, remaining } = await ratelimit.limit(ip);
    if (!success) {
      return new NextResponse("Too many requests. Please try again later.", {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      });
    }
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (
    pathname.includes("/auth/") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const traceId = request.headers.get("x-trace-id") || crypto.randomUUID();

  // @ts-expect-error NextAuth v5 dynamically adds auth to the request
  const session = request.auth;

  const response = intlMiddleware(request);

  if (session?.user?.tenantId) {
    response.headers.set("x-tenant-id", session.user.tenantId);
    response.headers.set("x-user-role", session.user.role || "");
  }

  response.headers.set("X-Trace-Id", traceId);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload",
  );

  return response;
});

export const config = {
  matcher: [
    "/",
    "/api/:path*",
    "/(es|en)/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
