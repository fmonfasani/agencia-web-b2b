import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

// ────────────────────────────────────────────────────
// NOTA: El frontend NO accede a la base de datos.
// La autenticación delega completamente a backend-saas.
// ────────────────────────────────────────────────────

interface CustomUser {
  id: string;
  email: string;
  name?: string | null;
  tenantId?: string;
  role?: string;
  apiKey?: string | null;
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
        debugger; // PAUSA AQUÍ
        console.log("[AUTH] === AUTHORIZE CALLED ===", credentials);

        if (!credentials?.email || !credentials?.password) {
          console.error("[AUTH] Missing email or password");
          return null;
        }

        const email = credentials.email.toString().trim().toLowerCase();
        const password = credentials.password.toString();
        if (!email || !password) return null;

        const saasUrl =
          process.env.NEXT_PUBLIC_SAAS_API_URL || "http://localhost:8000";

        try {
          console.log("[AUTH] Attempting login for:", email);
          const res = await fetch(`${saasUrl}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });

          console.log("[AUTH] Login response status:", res.status);
          if (!res.ok) {
            console.warn("[AUTH] backend-saas login failed:", res.status);
            return null;
          }

          const data = await res.json();
          console.log(
            "[AUTH] Login successful, raw response:",
            JSON.stringify(data),
          );
          // backend-saas devuelve: { id, api_key, email, nombre, rol, tenant_id, mensaje }
          const user = data.user ?? data;
          console.log("[AUTH] Extracted user object:", JSON.stringify(user));

          const apiKey = user.api_key || user.apiKey || user.api_Key;
          console.log("[AUTH] Extracted API Key:", apiKey);

          const role = user.role || user.rol || "MEMBER";
          console.log("[AUTH] Role mapping:", {
            "user.role": user.role,
            "user.rol": user.rol,
            "final role": role,
          });

          const result = {
            id: user.id,
            email: user.email,
            name: user.nombre || user.name || user.email,
            tenantId:
              user.tenantId ||
              user.tenant_id ||
              user.defaultTenantId ||
              "default",
            role: role,
            apiKey: apiKey,
          };
          console.log("[AUTH] Returning user object:", JSON.stringify(result));

          // 2 second delay para debugging
          await new Promise((resolve) => setTimeout(resolve, 2000));

          return result;
        } catch (err) {
          console.error("[AUTH] Error contacting backend-saas:", err);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/es/auth/sign-in",
  },
  callbacks: {
    async jwt({ token, user }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hasApiKey = user && (user as any).apiKey ? "YES" : "NO";
      const msg = `[JWT] user=${user ? "YES" : "NO"}, apiKey=${hasApiKey}`;
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "auth_log",
          (localStorage.getItem("auth_log") || "") + msg + "\n",
        );
      }
      if (user) {
        const customUser = user as CustomUser;
        token.id = customUser.id;
        token.tenantId = customUser.tenantId;
        token.role = customUser.role;
        token.apiKey = customUser.apiKey;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || (token.sub as string);
        session.user.tenantId = (token.tenantId as string) || "default";
        session.user.role = (token.role as string) || "MEMBER";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).apiKey = token.apiKey || "";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const apiKeyValue = (session.user as any).apiKey;
        console.log("[SESSION] Final session state:", {
          userId: session.user.id,
          role: session.user.role,
          tenantId: session.user.tenantId,
          hasApiKey: !!apiKeyValue,
        });
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // After login, redirect to dashboard
      if (url.startsWith(baseUrl)) return url;
      return `${baseUrl}/es/admin/dashboard`;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours — balance between UX and security
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production" ? true : false,
      },
    },
  },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
} satisfies NextAuthConfig;
