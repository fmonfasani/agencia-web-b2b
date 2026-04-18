/**
 * middleware.ts — RBAC & Routing
 * Webshooks SaaS — NextAuth v5
 *
 * Maneja:
 * - Rutas públicas (auth, api/auth)
 * - Redirect a login si no autenticado
 * - Redirect según rol en /dashboard
 * - Validación de acceso por zona y rol
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "ANALISTA"
  | "CLIENTE"
  | "MEMBER"
  | "VIEWER";

// Acceso por zona (sin prefijo de locale)
const ZONE_ACCESS: Record<string, Role[]> = {
  // Zona Admin
  "/admin": ["SUPER_ADMIN", "ADMIN", "ANALISTA"],

  // Zona Cliente — más restrictivos primero (match por longitud)
  "/app/chat": ["SUPER_ADMIN", "ADMIN", "ANALISTA", "CLIENTE", "MEMBER"],
  "/app/agents": ["SUPER_ADMIN", "ADMIN", "ANALISTA", "CLIENTE"],
  "/app/training": ["SUPER_ADMIN", "ADMIN", "ANALISTA", "CLIENTE"],
  "/app/marketplace": ["SUPER_ADMIN", "ADMIN", "ANALISTA", "CLIENTE"],
  "/app/observability": ["SUPER_ADMIN", "ADMIN", "ANALISTA", "CLIENTE"],
  "/app/lab": ["SUPER_ADMIN", "ADMIN", "ANALISTA"],
  "/app/reports": [
    "SUPER_ADMIN",
    "ADMIN",
    "ANALISTA",
    "CLIENTE",
    "MEMBER",
    "VIEWER",
  ],
  "/app/billing": ["SUPER_ADMIN", "ADMIN", "CLIENTE"],
  "/app/settings": ["SUPER_ADMIN", "ADMIN", "CLIENTE"],
  "/app": ["SUPER_ADMIN", "ADMIN", "ANALISTA", "CLIENTE", "MEMBER", "VIEWER"],
};

// Página home por rol (sin prefijo de locale)
const ROLE_HOME: Record<Role, string> = {
  SUPER_ADMIN: "/admin",
  ADMIN: "/admin",
  ANALISTA: "/admin",
  CLIENTE: "/app",
  MEMBER: "/app",
  VIEWER: "/app",
};

// Locales soportados
const LOCALES = ["es", "en"];
const DEFAULT_LOCALE = "es";

/**
 * Extrae el locale del pathname y retorna el path sin locale.
 * /es/app/chat → { locale: "es", path: "/app/chat" }
 * /app/chat    → { locale: "es", path: "/app/chat" }
 */
function stripLocale(pathname: string): { locale: string; path: string } {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length > 0 && LOCALES.includes(parts[0])) {
    const locale = parts[0];
    const path = "/" + parts.slice(1).join("/") || "/";
    return { locale, path };
  }
  return { locale: DEFAULT_LOCALE, path: pathname };
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const { locale, path } = stripLocale(pathname);

  // ── Rutas públicas ──────────────────────────────────────────────
  if (
    path.startsWith("/auth/") ||
    path === "/auth" ||
    path === "/" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.match(/\.(png|svg|jpg|jpeg|ico|css|js|woff|woff2)$/)
  ) {
    return NextResponse.next();
  }

  const user = req.auth?.user;
  const role = (user?.role as Role) || null;

  // ── No autenticado → login ──────────────────────────────────────
  if (!user || !role) {
    const signIn = new URL(`/${locale}/auth/sign-in`, req.url);
    signIn.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signIn);
  }

  // ── /dashboard → home según rol ────────────────────────────────
  if (path === "/dashboard" || path === "/") {
    const home = ROLE_HOME[role] ?? "/app";
    return NextResponse.redirect(new URL(`/${locale}${home}`, req.url));
  }

  // ── Validar acceso por zona ────────────────────────────────────
  // Buscar la regla más específica (mayor longitud de prefijo)
  const match = Object.keys(ZONE_ACCESS)
    .filter((zone) => path.startsWith(zone))
    .sort((a, b) => b.length - a.length)[0];

  if (match) {
    const allowed = ZONE_ACCESS[match];
    if (!allowed.includes(role)) {
      // Redirige al home del rol actual
      const home = ROLE_HOME[role] ?? "/app";
      return NextResponse.redirect(new URL(`/${locale}${home}`, req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Excluir archivos estáticos y _next internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.jpg$|.*\\.ico$).*)",
  ],
};
