import { cookies, headers } from "next/headers";

export const APP_ROLES = ["OWNER", "ADMIN", "SALES", "VIEWER"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export class AuthorizationError extends Error {
  status: number;

  constructor(message = "Forbidden", status = 403) {
    super(message);
    this.name = "AuthorizationError";
    this.status = status;
  }
}

function isAppRole(value: string | null | undefined): value is AppRole {
  return APP_ROLES.includes((value || "").toUpperCase() as AppRole);
}

function parseRole(value: string | null | undefined): AppRole | null {
  if (!value) return null;

  const normalized = value.toUpperCase();
  return isAppRole(normalized) ? normalized : null;
}

function parseRoleFromCookie(rawCookieHeader: string | null): AppRole | null {
  if (!rawCookieHeader) return null;

  const roleCookie = rawCookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith("user_role="));

  if (!roleCookie) return null;

  const [, roleValue] = roleCookie.split("=");
  return parseRole(decodeURIComponent(roleValue || ""));
}

export function getRoleFromRequest(request: Request): AppRole | null {
  const roleFromHeader = parseRole(request.headers.get("x-user-role"));
  if (roleFromHeader) return roleFromHeader;

  const roleFromCookie = parseRoleFromCookie(request.headers.get("cookie"));
  if (roleFromCookie) return roleFromCookie;

  return parseRole(process.env.DEFAULT_APP_ROLE);
}

export async function getCurrentRole(): Promise<AppRole | null> {
  const requestHeaders = await headers();
  const roleFromHeader = parseRole(requestHeaders.get("x-user-role"));

  if (roleFromHeader) return roleFromHeader;

  const cookieStore = await cookies();
  const roleFromCookie = parseRole(cookieStore.get("user_role")?.value);

  if (roleFromCookie) return roleFromCookie;

  return parseRole(process.env.DEFAULT_APP_ROLE);
}

export async function requireRole(allowedRoles: AppRole[]): Promise<AppRole> {
  const currentRole = await getCurrentRole();

  if (!currentRole) {
    throw new AuthorizationError("Authentication required", 401);
  }

  if (!allowedRoles.includes(currentRole)) {
    throw new AuthorizationError("Insufficient role", 403);
  }

  return currentRole;
}

export function requireRoleForRequest(
  request: Request,
  allowedRoles: AppRole[],
): AppRole {
  const currentRole = getRoleFromRequest(request);

  if (!currentRole) {
    throw new AuthorizationError("Authentication required", 401);
  }

  if (!allowedRoles.includes(currentRole)) {
    throw new AuthorizationError("Insufficient role", 403);
  }

  return currentRole;
}
