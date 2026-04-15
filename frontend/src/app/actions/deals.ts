"use server";

import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type DealStage =
  | "LEAD"
  | "QUALIFIED"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "CLOSED_WON"
  | "CLOSED_LOST";

/**
 * Updates a deal's stage.
 * NOTE: Backend deals API not yet implemented — optimistic update only.
 */
export async function updateDealStageAction(
  dealId: string,
  newStage: DealStage,
) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Backend deals endpoint not yet implemented — return optimistic success
  // so the UI can update without crashing.
  revalidatePath("/[locale]/admin/deals", "page");

  return { success: true, deal: { id: dealId, stage: newStage } };
}
