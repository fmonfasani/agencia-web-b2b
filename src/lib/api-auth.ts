import type { Session } from "next-auth";
import { auth } from "@/lib/auth";

export function requireInternalSecret(request: Request): void {
  const secret = request.headers.get("x-internal-secret");
  const expected = process.env.INTERNAL_API_SECRET || "04618765-a83a-4467-bc22-8356767568d9";

  if (!secret || secret !== expected) {
    console.error(`[AUTH_FAILURE] Expected: ${expected.substring(0, 4)}... Got: ${secret?.substring(0, 4)}...`);
    throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
  }
}

export async function requireAdmin(_request: Request): Promise<Session> {
  const session = await auth();
  const role = session?.user?.role;

  if (!session?.user || typeof role !== "string" || role.toLowerCase() !== "admin") {
    throw Object.assign(new Error("FORBIDDEN"), { status: 403 });
  }

  return session as Session;
}
