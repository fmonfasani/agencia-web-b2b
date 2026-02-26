import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/security/cookies";

const intlMiddleware = createMiddleware({
  locales: ["en", "es"],
  defaultLocale: "es",
  localePrefix: "always",
});

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip if it's an internal Next.js request or an API
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Apply Internationalization
  const response = intlMiddleware(request);

  // 3. Admin Protection
  const ADMIN_ROUTE_REGEX = /^\/(es|en)\/admin(?:\/.*)?$/;
  if (ADMIN_ROUTE_REGEX.test(pathname)) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      const locale = pathname.split("/")[1] || "es";
      return NextResponse.redirect(new URL(`/${locale}/auth/sign-in`, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
