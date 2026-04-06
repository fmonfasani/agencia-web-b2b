"use server";

import { auth } from "@/lib/auth";
import { saasClientFor } from "@/lib/saas-client";

export async function executeAgent(query: string) {
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
    const response = await client.agent.execute({
      query,
      tenant_id: tenantId,
      max_iterations: 5,
    });

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    console.error("[Agent] Error executing agent:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
