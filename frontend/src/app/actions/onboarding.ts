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

export async function getOnboardingStatus() {
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

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    console.error("[Onboarding] Error getting status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
