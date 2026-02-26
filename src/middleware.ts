import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Evitar que el middleware de idiomas maneje archivos internos de Next.js u otros activos
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  return intlMiddleware(request);
}

export const config = {
  // Ajuste fino del matcher para capturar solo lo que necesitamos traducir
  matcher: ["/", "/(es|en)/:path*", "/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
