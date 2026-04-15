"use server";

import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Updates the branding configuration for the current active tenant.
 * NOTE: Backend branding API not yet implemented — stub returns success.
 */
export async function updateTenantBranding(branding: any) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Authentication required");
  }

  // Backend tenant branding endpoint not yet implemented.
  // Revalidate layout so CSS vars pick up changes when backend is wired in.
  revalidatePath("/", "layout");

  return { success: true };
}
