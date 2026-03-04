import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AuthorizationError, requireRole } from "@/lib/authz";
import { Role } from "@prisma/client";

export default async function IntelligenceAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  try {
    await requireRole(["SUPER_ADMIN", "ADMIN", "VIEWER"] as Role[]);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      notFound();
    }

    throw error;
  }

  return children;
}
