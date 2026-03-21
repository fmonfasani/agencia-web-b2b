import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { redirect } from "next/navigation";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
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
