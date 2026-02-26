import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. PRIORIDAD: Rutas de API y Auth.js deben pasar sin interferencia
  // Esto incluye /api/auth, /es/api/auth, etc.
  if (
    pathname.includes("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Aplicar el middleware de idiomas para el resto de las rutas
  return intlMiddleware(request);
}

export const config = {
  // Ajustamos el matcher para ser más específicos
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
