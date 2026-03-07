import type { Session } from "next-auth";
import { auth } from "@/lib/auth";

export function requireInternalSecret(request: Request): void {
  const secret = request.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
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
