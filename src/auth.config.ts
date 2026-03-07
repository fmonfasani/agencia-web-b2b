import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

export const authConfig = {
    providers: [
        Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            // SECURITY: email linking without active session enables account takeover
            allowDangerousEmailAccountLinking: false,
        }),
        MicrosoftEntraID({
            clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
            clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
            issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
            // SECURITY: email linking without active session enables account takeover
            allowDangerousEmailAccountLinking: false,
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
                session.user.id =
                    typeof token.sub === "string"
                        ? token.sub
                        : (session.user.id ?? "internal");
                session.user.tenantId =
                    typeof token.tenantId === "string" ? token.tenantId : "internal";
                session.user.role =
                    typeof token.role === "string" ? token.role : "member";
            }
            return {
                ...session,
                expires: session.expires,
            };
        },
        async jwt({ token, user }) {
            if (user) {
                token.tenantId = user.tenantId;
                token.role = user.role;
            }
            return token;
        },
    },
} satisfies NextAuthConfig;
