import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

export const authConfig = {
    providers: [
        Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: true,
        }),
        MicrosoftEntraID({
            clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
            clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
            issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
            allowDangerousEmailAccountLinking: true,
        }),
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
    ],
    pages: {
        signIn: "/es/auth/sign-in",
    },
    callbacks: {
        async session({ session, token }) {
            if (session.user && token) {
                (session.user as any).id = token.sub as string;
                (session.user as any).tenantId = (token as any).tenantId ?? "internal";
                (session.user as any).role = (token as any).role ?? "member";
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                (token as any).tenantId = (user as any).tenantId;
                (token as any).role = (user as any).role;
            }
            return token;
        },
    },
} satisfies NextAuthConfig;
