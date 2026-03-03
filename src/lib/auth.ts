import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { redirect } from "next/navigation";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" }, // Usar JWT para que el middleware sea ligero
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async session(params: any) {
      const { session, token, user } = params;

      if (token && session.user) {
        session.user.id = token.sub;
        session.user.tenantId = token.tenantId ?? "internal";
        session.user.role = token.role ?? "member";
      }

      if (user && session.user) {
        session.user.id = user.id;
        session.user.tenantId = user.tenantId ?? "internal";
        session.user.role = user.role ?? "member";
      }

      return session;
    },
  },
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
