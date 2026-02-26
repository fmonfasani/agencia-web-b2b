import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/security/cookies";

const intlMiddleware = createMiddleware({
  locales: ["en", "es"],
  defaultLocale: "es",
});

const ADMIN_ROUTE_REGEX = /^\/(es|en)\/admin(?:\/.*)?$/;
const SIGN_IN_ROUTE_REGEX = /^\/(es|en)\/auth\/sign-in\/?$/;
const PUBLIC_FILE_REGEX = /\.[^/]+$/;
const PUBLIC_PREFIXES = ["/_next", "/api", "/assets", "/images"];
const PUBLIC_EXACT = ["/favicon.ico", "/robots.txt", "/sitemap.xml"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_FILE_REGEX.test(pathname)) {
    return true;
  }

  if (PUBLIC_EXACT.includes(pathname)) {
    return true;
  }

  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }

  return SIGN_IN_ROUTE_REGEX.test(pathname);
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Run intlMiddleware first for all matching routes
  const response = intlMiddleware(request);

  // 2. Auth Protection Logic
  if (ADMIN_ROUTE_REGEX.test(pathname)) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      const locale = pathname.split("/")[1] || "es";
      const signInUrl = new URL(`/${locale}/auth/sign-in`, request.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  return response;
}

export const config = {
  // Match all pathnames except for
  // - API routes (/api)
  // - Static files (_next/static, _next/image, favicon.ico, etc.)
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
