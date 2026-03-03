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

      // Llamar al callback base de authConfig
      const updatedSession = await authConfig.callbacks.session({ session, token });

      if (user && updatedSession.user) {
        updatedSession.user.id = user.id;
        (updatedSession.user as any).tenantId = user.tenantId ?? "internal";
        (updatedSession.user as any).role = user.role ?? "member";
      }

      return updatedSession;
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
