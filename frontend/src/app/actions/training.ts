"use server";

import { auth } from "@/lib/auth";
import { saasClientFor } from "@/lib/saas-client";
import type {
  TrainingDocument,
  TrainingDocumentDetail,
  TrainingSummary,
} from "@/lib/saas-client";

async function getClient() {
  const session = await auth();
  const apiKey =
    (session?.user as any)?.apiKey || (session as any)?.backendApiKey;
  if (!apiKey) throw new Error("No API key in session");
  return saasClientFor(apiKey);
}

// ── Cliente ───────────────────────────────────────────────────────────────────

export async function getMyDocuments(): Promise<TrainingDocument[]> {
  try {
    const client = await getClient();
    const res = await client.training.getMyDocuments();
    return res.documents;
  } catch (e) {
    console.warn("[training] getMyDocuments:", e);
    return [];
  }
}

export async function uploadTrainingDocument(
  formData: FormData,
): Promise<{
  success: boolean;
  error?: string;
  results?: Array<{
    filename: string;
    duplicate: boolean;
    quality_score?: number;
  }>;
}> {
  try {
    const client = await getClient();
    const files = formData.getAll("files") as File[];
    if (!files.length)
      return { success: false, error: "No se seleccionaron archivos" };

    const results = await Promise.all(
      files.map(async (file) => {
        const r = await client.training.uploadDocument(file);
        return {
          filename: file.name,
          duplicate: r.duplicate,
          quality_score: r.quality_score,
        };
      }),
    );
    return { success: true, results };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

export async function getMyTrainingSummary(): Promise<TrainingSummary | null> {
  try {
    const client = await getClient();
    const tenant = await client.tenant.me();
    if (!tenant?.id) return null;
    return await client.training.getStatus(tenant.id);
  } catch (e) {
    console.warn("[training] getMyTrainingSummary:", e);
    return null;
  }
}

export async function getAllDocuments() {
  try {
    const client = await getClient();
    const res = await client.training.getAllDocuments();
    return res.documents;
  } catch (e) {
    console.warn("[training] getAllDocuments:", e);
    return [];
  }
}

export async function getTrainingMetricsAndQdrant() {
  try {
    const client = await getClient();
    const [metrics, qdrant] = await Promise.all([
      client.training.getMetrics().catch(() => null),
      client.training.getQdrantStats().catch(() => null),
    ]);
    return { metrics, qdrant };
  } catch (e) {
    console.warn("[training] getTrainingMetricsAndQdrant:", e);
    return { metrics: null, qdrant: null };
  }
}

// ── Analista ──────────────────────────────────────────────────────────────────

export async function getPendingDocuments(): Promise<TrainingDocument[]> {
  try {
    const client = await getClient();
    const res = await client.training.getPendingDocuments();
    return res.documents;
  } catch (e) {
    console.warn("[training] getPendingDocuments:", e);
    return [];
  }
}

export async function getDocumentDetail(
  docId: string,
): Promise<TrainingDocumentDetail | null> {
  try {
    const client = await getClient();
    return await client.training.getDocument(docId);
  } catch (e) {
    console.warn("[training] getDocumentDetail:", e);
    return null;
  }
}

export async function updateDocumentContent(
  docId: string,
  contentProcessed: string,
  metadata?: Record<string, unknown>,
  chunkConfig?: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getClient();
    await client.training.updateDocument(docId, {
      content_processed: contentProcessed,
      metadata,
      chunk_config: chunkConfig,
    });
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

export async function ingestDocument(
  docId: string,
  chunkConfig?: Record<string, unknown>,
): Promise<{
  success: boolean;
  error?: string;
  chunks?: number;
  vectors?: number;
}> {
  try {
    const client = await getClient();
    const res = await client.training.ingestDocument(docId, chunkConfig);
    return { success: true, chunks: res.chunks, vectors: res.vectors };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

export async function rejectDocument(
  docId: string,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getClient();
    await client.training.rejectDocument(docId, reason);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}
