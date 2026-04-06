"use server";

import { auth } from "@/lib/auth";
import { saasClientFor } from "@/lib/saas-client";

export async function uploadDocuments(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("No autenticado");
  }

  const apiKey = (session.user as any)?.apiKey;
  const tenantId = session.user?.tenantId;

  if (!apiKey || !tenantId) {
    throw new Error("Credenciales incompletas");
  }

  const client = saasClientFor(apiKey);
  const files = formData.getAll("files") as File[];

  try {
    const response = await client.onboarding.uploadFiles(tenantId, files);

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    console.error("[Onboarding] Error uploading documents:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

export interface OnboardingStatusData {
  tenantId: string;
  status: string;
  documentsCount: number;
  vectorsCount: number;
  postgresOk: boolean;
  qdrantOk: boolean;
  completionPercentage: number;
  step: "upload" | "processing" | "ready";
  error?: string;
}

export async function getOnboardingStatus(): Promise<{
  success: boolean;
  data?: OnboardingStatusData;
  error?: string;
}> {
  const session = await auth();

  if (!session?.user) {
    throw new Error("No autenticado");
  }

  const apiKey = (session.user as any)?.apiKey;
  const tenantId = session.user?.tenantId;

  if (!apiKey || !tenantId) {
    throw new Error("Credenciales incompletas");
  }

  const client = saasClientFor(apiKey);

  try {
    const response = await client.onboarding.status(tenantId);

    // Calculate completion percentage and step
    let completionPercentage = 0;
    let step: "upload" | "processing" | "ready" = "upload";

    if (response.postgres_ok) completionPercentage += 33;
    if (response.qdrant_ok) completionPercentage += 33;
    if ((response.chunks_count || 0) > 0) completionPercentage += 34;

    // Determine current step
    if ((response.chunks_count || 0) === 0) {
      step = "upload";
    } else if (!response.postgres_ok || !response.qdrant_ok) {
      step = "processing";
    } else {
      step = "ready";
    }

    const data: OnboardingStatusData = {
      tenantId: response.tenant_id,
      status: response.status,
      documentsCount: response.chunks_count || 0,
      vectorsCount: response.vectors_count || 0,
      postgresOk: response.postgres_ok || false,
      qdrantOk: response.qdrant_ok || false,
      completionPercentage: Math.min(completionPercentage, 100),
      step,
    };

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("[Onboarding] Error getting status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
