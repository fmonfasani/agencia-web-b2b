import { Role } from "@prisma/client";

/**
 * Enterprise RBAC Permissions Matrix
 * Defines what each role can do within a Tenant.
 */

export type Permission =
  | "VIEW_LEADS"
  | "EDIT_LEADS"
  | "DELETE_LEADS"
  | "MANAGE_TEAM"
  | "VIEW_AUDIT_LOGS"
  | "MANAGE_SETTINGS"
  | "PLATFORM_ADMIN";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    "VIEW_LEADS",
    "EDIT_LEADS",
    "DELETE_LEADS",
    "MANAGE_TEAM",
    "VIEW_AUDIT_LOGS",
    "MANAGE_SETTINGS",
    "PLATFORM_ADMIN",
  ],
  ADMIN: [
    "VIEW_LEADS",
    "EDIT_LEADS",
    "DELETE_LEADS",
    "MANAGE_TEAM",
    "VIEW_AUDIT_LOGS",
    "MANAGE_SETTINGS",
  ],
  OPERATOR: ["VIEW_LEADS", "EDIT_LEADS", "DELETE_LEADS", "VIEW_AUDIT_LOGS"],
  MEMBER: ["VIEW_LEADS", "EDIT_LEADS"],
  VIEWER: ["VIEW_LEADS"],
};

/**
 * Check if a specific role has a permission.
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Higher role check: Can 'actor' modify 'target'?
 * A user cannot modify another user with equal or higher rank.
 */
const ROLE_RANK: Record<Role, number> = {
  SUPER_ADMIN: 100,
  ADMIN: 80,
  OPERATOR: 60,
  MEMBER: 40,
  VIEWER: 20,
};

export function canModifyRole(actorRole: Role, targetRole: Role): boolean {
  return ROLE_RANK[actorRole] > ROLE_RANK[targetRole];
}
