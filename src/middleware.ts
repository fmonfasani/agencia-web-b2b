import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { auth } from "@/lib/auth";

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

  // 2. Inyectar contexto de Tenant en las cabeceras de la petición
  const session = (request as any).auth;
  const requestHeaders = new Headers(request.headers);
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
