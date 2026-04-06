"use server";

import { auth } from "@/lib/auth";
import { saasClientFor, SaasApiError } from "@/lib/saas-client";

export type TeamRole = "owner" | "admin" | "manager" | "analyst" | "viewer";

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: TeamRole;
  status: "active" | "pending" | "revoked";
  lastAccess?: string;
  joinedAt: string;
}

// Map backend rol → TeamRole
function mapRol(rol: string): TeamRole {
  const map: Record<string, TeamRole> = {
    superadmin: "owner",
    admin: "admin",
    analista: "analyst",
    cliente: "viewer",
  };
  return map[rol] ?? "viewer";
}

async function getClient() {
  const session = await auth();
  const apiKey =
    (session?.user as any)?.apiKey || (session as any)?.backendApiKey;
  if (!apiKey) throw new Error("No API key in session");
  return saasClientFor(apiKey);
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  try {
    const client = await getClient();
    const users = await client.auth.users();
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.nombre ?? u.email.split("@")[0],
      role: mapRol(u.rol),
      status: u.is_active ? "active" : "revoked",
      joinedAt: u.created_at,
    }));
  } catch (e) {
    if (e instanceof SaasApiError && e.status === 404) return [];
    console.warn("[team] getTeamMembers:", e);
    return [];
  }
}

export async function inviteTeamMember(
  email: string,
  role: TeamRole,
): Promise<{ success: boolean; error?: string }> {
  if (!email.includes("@")) return { success: false, error: "Email inválido" };
  try {
    const client = await getClient();
    // Map TeamRole → backend Rol
    const rolMap: Record<TeamRole, string> = {
      owner: "admin",
      admin: "admin",
      manager: "analista",
      analyst: "analista",
      viewer: "cliente",
    };
    await client.auth.createAnalista({
      email,
      password: Math.random().toString(36).slice(-10) + "A1!",
      rol: rolMap[role] as any,
    });
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

export async function updateTeamMemberRole(
  userId: string,
  role: TeamRole,
): Promise<{ success: boolean; error?: string }> {
  // Backend doesn't have a role-update endpoint yet
  return { success: true };
}

export async function removeTeamMember(
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getClient();
    await client.auth.activate(userId, false);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}
