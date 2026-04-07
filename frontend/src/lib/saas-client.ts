/**
 * Typed HTTP client for backend-saas (Python API Gateway).
 * Server-side only — uses env vars directly.
 *
 * Usage:
 *   import { saasClient } from "@/lib/saas-client"
 *   const health = await saasClient.health()
 *
 *   // With user API key (wh_xxxxx from session):
 *   const client = saasClientFor(session.backendApiKey)
 *   const traces = await client.agent.traces()
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type Rol = "cliente" | "analista" | "admin" | "superadmin";

export interface RegisterRequest {
  email: string;
  password: string;
  nombre?: string;
  rol?: Rol;
  tenant_id?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  api_key: string;
  user_id: string;
  email: string;
  nombre?: string;
  rol: Rol;
  tenant_id?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  nombre?: string;
  rol: Rol;
  tenant_id?: string;
  is_active: boolean;
  created_at: string;
}

export interface TenantResponse {
  id: string;
  nombre: string;
  industria?: string;
  descripcion?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TenantUpdateRequest {
  nombre?: string;
  industria?: string;
  descripcion?: string;
}

export interface OnboardingStatusResponse {
  tenant_id: string;
  status: string;
  chunks_count?: number;
  vectors_count?: number;
  postgres_ok?: boolean;
  qdrant_ok?: boolean;
}

export interface AgentRequest {
  query: string;
  tenant_id?: string;
  trace_id?: string;
  max_iterations?: number;
  temperature?: number;
  enable_detailed_trace?: boolean;
}

export interface AgentMessage {
  role: "user" | "assistant" | "tool" | "system";
  content: string;
}

export interface AgentMetadata {
  tenant_id: string;
  iterations: number;
  llm_calls: number;
  tools_executed: string[];
  results_count: number;
  rag_hits_count: number;
  finish_reason: string;
  model: string;
  embedding_ms: number;
  rag_ms: number;
  llm_ms: number;
}

export interface AgentResponse {
  trace_id: string;
  tenant_id: string;
  query: string;
  result: AgentMessage[];
  iterations: number;
  metadata: AgentMetadata;
  total_duration_ms: number;
  timestamp_start: string;
  timestamp_end: string;
}

export interface AgentTrace {
  id: string;
  tenant_id: string;
  query: string;
  result?: string;
  iterations?: number;
  total_duration_ms?: number;
  metadata?: AgentMetadata;
  success?: boolean;
  created_at: string;
}

export interface AgentMetricsResponse {
  tenant_id: string;
  avg_iterations: number;
  avg_duration_ms: number;
  total_executions: number;
  error_count: number;
  success_rate: number;
  last_execution?: string;
}

export interface AgentSede {
  nombre: string;
  direccion?: string;
  ciudad?: string;
  telefono?: string;
}

export interface AgentServicio {
  nombre: string;
  descripcion?: string;
  precio?: string;
}

export interface AgentConfigResponse {
  tenant_id: string;
  nombre?: string;
  descripcion?: string;
  sedes?: AgentSede[];
  servicios?: AgentServicio[];
  coberturas?: string[];
}

// ─── Training types ───────────────────────────────────────────────────────────

export type TrainingDocStatus =
  | "uploaded"
  | "preprocessing"
  | "extracted"
  | "reviewing"
  | "approved"
  | "chunking"
  | "embedding"
  | "ingested"
  | "failed"
  | "rejected";

export interface TrainingDocument {
  id: string;
  tenant_id?: string;
  filename: string;
  file_type: string;
  file_size_bytes: number;
  status: TrainingDocStatus;
  quality_score?: number;
  quality_issues: string[];
  metadata: Record<string, unknown>;
  chunk_config: Record<string, unknown>;
  rejection_reason?: string;
  uploaded_at?: string;
  processed_at?: string;
  ingested_at?: string;
  chunk_count?: number;
}

export interface TrainingDocumentDetail extends TrainingDocument {
  content_raw?: string;
  content_processed?: string;
}

export interface TrainingUploadResult {
  success: boolean;
  document_id: string;
  status: TrainingDocStatus;
  quality_score?: number;
  quality_issues: string[];
  duplicate: boolean;
}

export interface TrainingSummary {
  tenant_id: string;
  documents: Record<TrainingDocStatus, number>;
  total_chunks: number;
  total_embeddings: number;
}

export interface IngestResult {
  success: boolean;
  doc_id: string;
  chunks: number;
  vectors: number;
}

export interface TrainingMetrics {
  documents: {
    by_status: Record<string, number>;
    total: number;
    ingested: number;
    pending: number;
    rejected: number;
    failed: number;
  };
  quality: { avg_score: number; below_threshold: number; perfect: number };
  chunks: { total: number; avg_tokens_per_chunk: number };
  embeddings: { total: number; models_count: number };
  by_tenant: Array<{
    tenant_id: string;
    total_docs: number;
    ingested: number;
    pending: number;
    chunks: number;
    last_upload?: string;
  }>;
  daily_uploads: Array<{ date: string; count: number }>;
}

export interface QdrantStats {
  collections: Array<{
    collection: string;
    vectors_count: number;
    indexed_vectors?: number;
    points_count?: number;
    status: string;
  }>;
  total_collections: number;
}

export interface HealthService {
  status: "connected" | "error" | "skipped" | "unreachable";
  message?: string;
}

export interface HealthResponse {
  status: "ok" | "degraded";
  timestamp: string;
  services: {
    postgres?: HealthService;
    qdrant?: HealthService;
    ollama?: HealthService;
  };
}

// ─── Client ───────────────────────────────────────────────────────────────────

class SaasApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    message: string,
  ) {
    super(message);
    this.name = "SaasApiError";
  }
}

class BackendSaasClient {
  private baseUrl: string;
  private apiKey: string;
  private readonly DEFAULT_TIMEOUT_MS = 30_000; // 30 seconds
  private readonly UPLOAD_TIMEOUT_MS = 120_000; // 120 seconds for file uploads

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = (
      baseUrl ??
      process.env.AGENT_SERVICE_URL ??
      "http://localhost:8000"
    ).replace(/\/$/, "");
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    timeoutMs: number = this.DEFAULT_TIMEOUT_MS,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.apiKey,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        cache: "no-store",
        signal: controller.signal,
      });

      if (!res.ok) {
        let errorBody: unknown;
        try {
          errorBody = await res.json();
        } catch {
          errorBody = await res.text();
        }
        throw new SaasApiError(
          res.status,
          errorBody,
          `Backend error ${res.status} on ${method} ${path}`,
        );
      }

      return res.json() as Promise<T>;
    } finally {
      clearTimeout(timer);
    }
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  readonly auth = {
    register: (data: RegisterRequest) =>
      this.request<UserResponse>("POST", "/auth/register", data),

    login: (data: LoginRequest) =>
      this.request<LoginResponse>("POST", "/auth/login", data),

    me: () => this.request<UserResponse>("GET", "/auth/me"),

    users: () => this.request<UserResponse[]>("GET", "/auth/users"),

    activate: (userId: string, isActive: boolean) =>
      this.request<{ success: boolean }>("POST", "/auth/activate", {
        user_id: userId,
        is_active: isActive,
      }),

    createAnalista: (data: RegisterRequest) =>
      this.request<UserResponse>("POST", "/auth/create-analista", data),
  };

  // ── Onboarding ────────────────────────────────────────────────────────────

  readonly onboarding = {
    createTenant: (form: Record<string, unknown>) =>
      this.request<{ tenant_id: string; status: string }>(
        "POST",
        "/onboarding/tenant",
        form,
      ),

    status: (tenantId: string) =>
      this.request<OnboardingStatusResponse>(
        "GET",
        `/onboarding/status/${tenantId}`,
      ),

    deleteTenant: (tenantId: string) =>
      this.request<{ success: boolean }>(
        "DELETE",
        `/onboarding/tenant/${tenantId}`,
      ),

    /** Upload is multipart — handled separately, see uploadFiles() */
    uploadFiles: async (
      tenantId: string,
      files: File[],
    ): Promise<{ upload_ids: string[] }> => {
      const form = new FormData();
      form.append("tenant_id", tenantId);
      for (const file of files) form.append("files", file);

      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        this.UPLOAD_TIMEOUT_MS,
      );

      try {
        const res = await fetch(`${this.baseUrl}/onboarding/upload`, {
          method: "POST",
          headers: { "X-API-Key": this.apiKey },
          body: form,
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok)
          throw new SaasApiError(res.status, await res.text(), "Upload failed");
        return res.json();
      } finally {
        clearTimeout(timer);
      }
    },
  };

  // ── Tenants ───────────────────────────────────────────────────────────────

  readonly tenant = {
    list: () => this.request<TenantResponse[]>("GET", "/tenant/"),

    get: (tenantId: string) =>
      this.request<TenantResponse>("GET", `/tenant/${tenantId}`),

    update: (tenantId: string, data: TenantUpdateRequest) =>
      this.request<TenantResponse>("PUT", `/tenant/${tenantId}`, data),

    me: () => this.request<TenantResponse>("GET", "/tenant/me"),
  };

  // ── Agent ─────────────────────────────────────────────────────────────────

  readonly agent = {
    execute: (req: AgentRequest) =>
      this.request<AgentResponse>("POST", "/agent/execute", req),

    config: () => this.request<AgentConfigResponse>("GET", "/agent/config"),

    traces: () => this.request<AgentTrace[]>("GET", "/agent/traces"),

    metrics: () => this.request<AgentMetricsResponse>("GET", "/metrics/agent"),
  };

  // ── Training ──────────────────────────────────────────────────────────────

  readonly training = {
    /** Cliente: sube un documento al pipeline de entrenamiento */
    uploadDocument: async (
      file: File,
      tenantId?: string,
    ): Promise<TrainingUploadResult> => {
      const form = new FormData();
      form.append("file", file);
      if (tenantId) form.append("tenant_id", tenantId);

      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        this.UPLOAD_TIMEOUT_MS,
      );
      try {
        const res = await fetch(`${this.baseUrl}/training/upload`, {
          method: "POST",
          headers: { "X-API-Key": this.apiKey },
          body: form,
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok)
          throw new SaasApiError(
            res.status,
            await res.text(),
            "Training upload failed",
          );
        return res.json();
      } finally {
        clearTimeout(timer);
      }
    },

    /** Cliente: lista sus documentos */
    getMyDocuments: () =>
      this.request<{ documents: TrainingDocument[]; total: number }>(
        "GET",
        "/training/documents",
      ),

    /** Estado agregado de entrenamiento de un tenant */
    getStatus: (tenantId: string) =>
      this.request<TrainingSummary>("GET", `/training/status/${tenantId}`),

    /** Analista: todos los documentos pendientes (cross-tenant) */
    getPendingDocuments: () =>
      this.request<{ documents: TrainingDocument[]; total: number }>(
        "GET",
        "/training/pending",
      ),

    /** Detalle de un documento (incluye content_raw y content_processed) */
    getDocument: (docId: string) =>
      this.request<TrainingDocumentDetail>(
        "GET",
        `/training/documents/${docId}`,
      ),

    /** Analista: edita contenido procesado, metadata, chunk_config */
    updateDocument: (
      docId: string,
      body: {
        content_processed?: string;
        metadata?: Record<string, unknown>;
        chunk_config?: Record<string, unknown>;
        status?: string;
      },
    ) =>
      this.request<{ success: boolean; doc_id: string }>(
        "PATCH",
        `/training/documents/${docId}`,
        body,
      ),

    /** Analista: dispara ingesta a Qdrant */
    ingestDocument: (docId: string, chunkConfig?: Record<string, unknown>) =>
      this.request<IngestResult>(
        "POST",
        `/training/documents/${docId}/ingest`,
        { chunk_config: chunkConfig },
      ),

    /** Analista: rechaza un documento */
    rejectDocument: (docId: string, reason: string) =>
      this.request<{ success: boolean; doc_id: string }>(
        "POST",
        `/training/documents/${docId}/reject`,
        { reason },
      ),

    /** Admin: todos los documentos sin filtro */
    getAllDocuments: () =>
      this.request<{ documents: TrainingDocument[]; total: number }>(
        "GET",
        "/training/all",
      ),

    /** Observabilidad: métricas agregadas */
    getMetrics: () => this.request<TrainingMetrics>("GET", "/training/metrics"),

    /** Observabilidad: stats de Qdrant (via backend-agents) */
    getQdrantStats: () =>
      this.request<QdrantStats>("GET", "/training/qdrant-stats"),
  };

  // ── Health ────────────────────────────────────────────────────────────────

  health = () => this.request<HealthResponse>("GET", "/health");
}

// ─── Exports ──────────────────────────────────────────────────────────────────

/**
 * Default client using the internal service API key.
 * Use this from Next.js server API routes for admin/internal operations.
 */
export const saasClient = new BackendSaasClient(
  process.env.AGENT_SERVICE_API_KEY ?? "",
);

/**
 * Create a client scoped to a specific user's wh_xxxxx API key.
 * Use this when acting on behalf of an authenticated user.
 */
export function saasClientFor(userApiKey: string): BackendSaasClient {
  return new BackendSaasClient(userApiKey);
}

export { BackendSaasClient, SaasApiError };
