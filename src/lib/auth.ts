import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { redirect } from "next/navigation";

const providers: any[] = [
  Credentials({
    name: "Internal credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email?.toString().trim().toLowerCase();
      const password = credentials?.password?.toString();

      const internalEmail =
        process.env.AUTH_INTERNAL_EMAIL?.trim().toLowerCase();
      const internalPassword = process.env.AUTH_INTERNAL_PASSWORD;
      const tenantId = process.env.AUTH_INTERNAL_TENANT_ID ?? "internal";
      const role = process.env.AUTH_INTERNAL_ROLE ?? "admin";

      if (!email || !password || !internalEmail || !internalPassword) {
        return null;
      }

      if (email !== internalEmail || password !== internalPassword) {
        return null;
      }

      return {
        id: `internal:${email}`,
        email,
        name: "Internal Admin",
        tenantId,
        role,
      };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

if (
  process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
  process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET
) {
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
  },
  providers,
  pages: {
    signIn: "/es/sign-in",
    signOut: "/es/sign-out",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.tenantId = user.tenantId ?? token.tenantId ?? "internal";
        token.role = user.role ?? token.role ?? "member";
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.tenantId =
          (token.tenantId as string | undefined) ?? "internal";
        session.user.role = (token.role as string | undefined) ?? "member";
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
    redirect(`/${locale}/sign-in`);
  }

  return session.user;
}
