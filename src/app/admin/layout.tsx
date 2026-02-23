import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AuthorizationError, requireRole } from "@/lib/authz";

export default async function IntelligenceAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  try {
    await requireRole(["OWNER", "ADMIN", "SALES", "VIEWER"]);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      notFound();
    }

    throw error;
  }

  return children;
}
