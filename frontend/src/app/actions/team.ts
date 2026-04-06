"use server";

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

const mockTeam: TeamMember[] = [
  { id: "u1", email: "admin@empresa.com", name: "Admin Principal", role: "owner", status: "active", lastAccess: "2026-04-06", joinedAt: "2026-01-01" },
  { id: "u2", email: "maria@empresa.com", name: "María García", role: "admin", status: "active", lastAccess: "2026-04-05", joinedAt: "2026-02-10" },
  { id: "u3", email: "carlos@empresa.com", name: "Carlos Méndez", role: "manager", status: "active", lastAccess: "2026-04-04", joinedAt: "2026-03-01" },
  { id: "u4", email: "nuevo@empresa.com", name: "Invitado Pendiente", role: "analyst", status: "pending", joinedAt: "2026-04-05" },
];

export async function getTeamMembers(): Promise<TeamMember[]> {
  return mockTeam;
}

export async function inviteTeamMember(
  email: string,
  role: TeamRole
): Promise<{ success: boolean; error?: string }> {
  if (!email.includes("@")) return { success: false, error: "Email inválido" };
  return { success: true };
}

export async function updateTeamMemberRole(
  userId: string,
  role: TeamRole
): Promise<{ success: boolean; error?: string }> {
  return { success: true };
}

export async function removeTeamMember(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  return { success: true };
}
