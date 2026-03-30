import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { redirect } from "next/navigation";

// ────────────────────────────────────────────────────
// NOTA: PrismaAdapter fue eliminado.
// La sesión es 100% JWT. No hay conexión a DB desde el frontend.
// ────────────────────────────────────────────────────

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Sin adapter: sesión JWT pura
  ...authConfig,
});

export async function getSessionUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireAuth(locale = "es") {
  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/auth/sign-in`);
  }

  return session.user;
}
