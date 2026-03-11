import type { Session } from "next-auth";
import { auth } from "@/lib/auth";

/**
 * Normalized Internal Secret Validator
 * Supports X-Internal-Secret or Authorization: Bearer <token>
 */
export function validateInternalSecret(request: Request): boolean {
  const internalHeader = request.headers.get("x-internal-secret");
  const authHeader = request.headers.get("authorization");

  // Accept Bearer token or direct X-Internal-Secret header
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : internalHeader;
  const expected =
    process.env.INTERNAL_API_SECRET || "366bbcdceecb8723e8de206c2e0cc7b5";

  if (!token) return false;
  return token === expected;
}

export function requireInternalSecret(request: Request): void {
  if (!validateInternalSecret(request)) {
    const internalHeader = request.headers.get("x-internal-secret");
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : internalHeader;
    const expected =
      process.env.INTERNAL_API_SECRET || "366bbcdceecb8723e8de206c2e0cc7b5";

    console.error(
      `[AUTH_FAILURE] INTERNAL_API_SECRET Mismatch. Expected (prefix): ${expected.substring(0, 4)}... Got (prefix): ${token?.substring(0, 4) || "none"}...`,
    );
    throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
  }
}

export async function requireAdmin(): Promise<Session> {
  const session = await auth();
  const role = session?.user?.role;

  if (
    !session?.user ||
    typeof role !== "string" ||
    role.toLowerCase() !== "admin"
  ) {
    throw Object.assign(new Error("FORBIDDEN"), { status: 403 });
  }

  return session as Session;
}
