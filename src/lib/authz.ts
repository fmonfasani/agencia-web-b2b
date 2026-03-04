import { Role } from "@prisma/client";

export const APP_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "MEMBER",
  "VIEWER",
] as const;

export type AppRole = Role;

export class AuthorizationError extends Error {
  status: number;

  constructor(message = "Forbidden", status = 403) {
    super(message);
    this.name = "AuthorizationError";
    this.status = status;
  }
}

function isAppRole(value: string | null | undefined): value is AppRole {
  return (APP_ROLES as unknown as string[]).includes((value || "").toUpperCase());
}

function parseRole(value: string | null | undefined): AppRole | null {
  if (!value) return null;

  const normalized = value.toUpperCase();
  return isAppRole(normalized) ? (normalized as AppRole) : null;
}


export function getRoleFromRequest(request: Request): AppRole | null {
  // Rely exclusively on process.env for default or skip if managed by session
  return parseRole(process.env.DEFAULT_APP_ROLE);
}

import { auth } from "./auth";
import { getActiveTenantId } from "./tenant-context";

import { requireAuth as requireCustomAuth } from "./auth/request-auth";

export async function requireTenantMembership(allowedRoles?: AppRole[]) {
  // 1. Try NextAuth (Google/OAuth)
  const session = await auth();

  // 2. Fallback to Custom Session (Registration/Internal Login)
  let user: any = session?.user;
  let tenantId: string | null = null;

  if (!user) {
    const custom = await requireCustomAuth();
    if (custom) {
      user = {
        ...(custom.user as any),
        userId: custom.user.id,
        tenantId: custom.session.tenantId,
        role: (custom.user as any).role || "MEMBER"
      };
      tenantId = custom.session.tenantId;
    }
  } else {
    tenantId = user.tenantId;
  }

  if (!user) {
    throw new AuthorizationError("Authentication required", 401);
  }

  const activeTenantId = await getActiveTenantId();

  // Verify if the user belongs to the active tenant
  if (activeTenantId && (user as any).tenantId !== activeTenantId && (user as any).role !== "SUPER_ADMIN") {
    throw new AuthorizationError("Access denied to this tenant", 403);
  }

  // Verify roles if specified
  if (allowedRoles && !allowedRoles.includes((user as any).role as AppRole)) {
    throw new AuthorizationError("Insufficient permissions for this action", 403);
  }

  return {
    user: user as any,
    tenantId: activeTenantId,
  };
}

export async function getCurrentRole(): Promise<AppRole | null> {
  const session = await auth();
  if (session?.user?.role) return session.user.role as AppRole;

  const custom = await requireCustomAuth();
  return (custom?.user?.role as AppRole) || null;
}

export async function requireRole(allowedRoles: AppRole[]): Promise<AppRole> {
  const role = await getCurrentRole();

  if (!role) {
    throw new AuthorizationError("Authentication required", 401);
  }

  if (!allowedRoles.includes(role)) {
    throw new AuthorizationError("Insufficient role", 403);
  }

  return role;
}
