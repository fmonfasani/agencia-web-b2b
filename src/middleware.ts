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
  // @ts-expect-error NextAuth v5 dynamically adds auth to the request
  const session = request.auth;
  if (session?.user?.tenantId) {
    requestHeaders.set("x-tenant-id", session.user.tenantId);
    requestHeaders.set("x-user-role", session.user.role || "");
  }

  // 3. Ejecutar el middleware de idiomas
  const response = intlMiddleware(request);

  // Inyectar cabeceras en la respuesta si es necesario
  if (session?.user?.tenantId) {
    response.headers.set("x-tenant-id", session.user.tenantId);
    response.headers.set("x-user-role", session.user.role || "");
  }

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
