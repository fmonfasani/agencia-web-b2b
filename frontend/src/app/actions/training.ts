"use server";

import { auth } from "@/lib/auth";
import { saasClientFor, SaasApiError } from "@/lib/saas-client";

export interface TrainingStatus {
  tenantId: string;
  tenantName: string;
  chunksCount: number;
  vectorsCount: number;
  postgresOk: boolean;
  qdrantOk: boolean;
  status: "ready" | "empty" | "error";
}

export interface TenantTrainingStatus extends TrainingStatus {
  lastUpload?: string;
}

async function getClient() {
  const session = await auth();
  const apiKey =
    (session?.user as any)?.apiKey || (session as any)?.backendApiKey;
  if (!apiKey) throw new Error("No API key in session");
  return { client: saasClientFor(apiKey), session };
}

export async function getTrainingStatus(): Promise<TrainingStatus> {
  const empty: TrainingStatus = {
    tenantId: "",
    tenantName: "Mi Empresa",
    chunksCount: 0,
    vectorsCount: 0,
    postgresOk: false,
    qdrantOk: false,
    status: "empty",
  };

  try {
    const { client } = await getClient();

    const tenant = await client.tenant.me().catch(() => null);
    const tenantId = tenant?.id ?? "";
    const tenantName = tenant?.nombre ?? "Mi Empresa";

    if (!tenantId) return { ...empty, tenantName };

    const s = await client.onboarding.status(tenantId).catch(() => null);
    if (!s) return { ...empty, tenantId, tenantName };

    const status: TrainingStatus["status"] =
      s.qdrant_ok && (s.vectors_count ?? 0) > 0
        ? "ready"
        : s.postgres_ok === false || s.qdrant_ok === false
          ? "error"
          : "empty";

    return {
      tenantId,
      tenantName,
      chunksCount: s.chunks_count ?? 0,
      vectorsCount: s.vectors_count ?? 0,
      postgresOk: s.postgres_ok ?? false,
      qdrantOk: s.qdrant_ok ?? false,
      status,
    };
  } catch (e) {
    console.warn("[training] getTrainingStatus:", e);
    return empty;
  }
}

export async function uploadDocuments(
  formData: FormData,
): Promise<{ success: boolean; error?: string; uploadCount?: number }> {
  try {
    const { client } = await getClient();

    const tenant = await client.tenant.me();
    const tenantId = tenant?.id;
    if (!tenantId) return { success: false, error: "Tenant no encontrado" };

    const files = formData.getAll("files") as File[];
    if (!files.length)
      return { success: false, error: "No se seleccionaron archivos" };

    const allowed = [
      "application/pdf",
      "text/plain",
      "text/csv",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const invalid = files.find((f) => !allowed.includes(f.type));
    if (invalid)
      return { success: false, error: `Formato no permitido: ${invalid.name}` };

    await client.onboarding.uploadFiles(tenantId, files);
    return { success: true, uploadCount: files.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

// ── Admin: todos los tenants con su estado de entrenamiento ───────────────────

export async function getAllTenantsTrainingStatus(): Promise<
  TenantTrainingStatus[]
> {
  try {
    const { client } = await getClient();
    const tenants = await client.tenant.list();

    const results = await Promise.allSettled(
      tenants.map(async (t) => {
        try {
          const s = await client.onboarding.status(t.id);
          const status: TrainingStatus["status"] =
            s.qdrant_ok && (s.vectors_count ?? 0) > 0
              ? "ready"
              : s.postgres_ok === false || s.qdrant_ok === false
                ? "error"
                : "empty";
          return {
            tenantId: t.id,
            tenantName: t.nombre,
            chunksCount: s.chunks_count ?? 0,
            vectorsCount: s.vectors_count ?? 0,
            postgresOk: s.postgres_ok ?? false,
            qdrantOk: s.qdrant_ok ?? false,
            status,
          } satisfies TenantTrainingStatus;
        } catch {
          return {
            tenantId: t.id,
            tenantName: t.nombre,
            chunksCount: 0,
            vectorsCount: 0,
            postgresOk: false,
            qdrantOk: false,
            status: "empty" as const,
          } satisfies TenantTrainingStatus;
        }
      }),
    );

    return results
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<TenantTrainingStatus>).value);
  } catch (e) {
    console.warn("[training] getAllTenantsTrainingStatus:", e);
    return [];
  }
}
