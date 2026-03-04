import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

const intlMiddleware = createMiddleware(routing);

export default auth(async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. IGNORAR rutas de API, Auth y archivos internos
  if (
    pathname.includes("/api/") ||
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
  const session = (request as any).auth;
  if (session?.user?.tenantId) {
    requestHeaders.set("x-tenant-id", session.user.tenantId);
    requestHeaders.set("x-user-role", session.user.role || "");
  }

  // 3. Ejecutar el middleware de idiomas con las nuevas cabeceras
  const response = intlMiddleware(new NextRequest(request, {
    headers: requestHeaders,
  }));

  if (session?.user?.tenantId) {
    response.headers.set("x-tenant-id", session.user.tenantId);
    response.headers.set("x-user-role", session.user.role || "");
  }

  return response;
});

export const config = {
  // Matcher simplificado y seguro
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
