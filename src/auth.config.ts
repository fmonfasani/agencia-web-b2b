import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { logAuditEvent } from "@/lib/security/audit";
import { headers } from "next/headers";

interface CustomUser {
  id: string;
  email: string;
  name?: string | null;
  tenantId?: string;
  role?: string;
}

export const authConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: false,
    }),
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
      allowDangerousEmailAccountLinking: false,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<CustomUser | null> {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email.toString().trim().toLowerCase();
        const password = credentials.password.toString();

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            memberships: {
              where: { status: "ACTIVE" },
              orderBy: { createdAt: "asc" },
              take: 1,
            },
          },
        });

        if (!user) {
          console.warn(`[AUTH_DEBUG] User not found for email: ${email}`);
          return null;
        }

        if (!user.passwordHash) {
          console.warn(
            `[AUTH_DEBUG] User found but has NO passwordHash: ${email}`,
          );
          return null;
        }

        const isValid = verifyPassword(password, user.passwordHash);

        if (!isValid) {
          console.warn(`[AUTH_DEBUG] Invalid password for email: ${email}`);
          const ip =
            (await headers()).get("x-forwarded-for")?.split(",")[0] ||
            "unknown";
          await logAuditEvent({
            eventType: "LOGIN_FAILED",
            userId: user.id,
            ipAddress: ip,
            metadata: { reason: "invalid_password" },
          }).catch(() => {});
          return null;
        }

        const defaultTenantId = user.memberships?.[0]?.tenantId || "default";

        const ip =
          (await headers()).get("x-forwarded-for")?.split(",")[0] || "unknown";
        await logAuditEvent({
          eventType: "LOGIN_SUCCESS",
          userId: user.id,
          tenantId: defaultTenantId,
          ipAddress: ip,
        }).catch(() => {});

        return {
          id: user.id,
          email: user.email,
          name: user.name || user.firstName || user.email,
          tenantId: defaultTenantId,
          role: user.memberships?.[0]?.role || "MEMBER",
        };
      },
    }),
  ],
  pages: {
    signIn: "/es/auth/sign-in",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const customUser = user as CustomUser;
        token.id = customUser.id;
        token.tenantId = customUser.tenantId;
        token.role = customUser.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || (token.sub as string);
        session.user.tenantId = (token.tenantId as string) || "default";
        session.user.role = (token.role as string) || "MEMBER";
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
} satisfies NextAuthConfig;
