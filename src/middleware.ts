import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignorar rutas que no deben ser traducidas (incluyendo NextAuth API)
  if (
    pathname.includes("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return;
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/", "/(es|en)/:path*"],
};
