import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. IGNORAR ABSOLUTAMENTE rutas de API, Auth y archivos internos del sistema
  if (
    pathname.includes("/api/") ||
    pathname.includes("/auth/") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // 2. Ejecutar el middleware de idiomas solo para páginas de contenido
  return intlMiddleware(request);
}

export const config = {
  // Matcher simplificado y seguro
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
