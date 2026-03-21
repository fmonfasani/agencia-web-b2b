import type { Session } from "next-auth";
import { auth } from "@/lib/auth";

/**
 * Normalized Internal Secret Validator
 * Supports X-Internal-Secret or Authorization: Bearer <token>
 * SECURITY: No hardcoded fallback - requires INTERNAL_API_SECRET env var
 */
export function validateInternalSecret(request: Request): boolean {
  const internalHeader = request.headers.get("x-internal-secret");
  const authHeader = request.headers.get("authorization");

  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : internalHeader;

  const expected = process.env.INTERNAL_API_SECRET;

  if (!expected) {
    console.error(
      "[AUTH_CRITICAL] INTERNAL_API_SECRET environment variable is not configured!",
    );
    return false;
  }

  if (!token) return false;
  return token === expected;
}

export function requireInternalSecret(request: Request): void {
  if (!validateInternalSecret(request)) {
    const internalHeader = request.headers.get("x-internal-secret");
    const authHeader = request.headers.get("authorization");
    const hasToken = !!(authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : internalHeader);

    console.error(
      `[AUTH_FAILURE] Internal API authentication failed. Token present: ${hasToken}`,
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
