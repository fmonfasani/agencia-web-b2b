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
  conversation_id?: string;
  trace_id?: string;
  max_iterations?: number;
  temperature?: number;
  enable_detailed_trace?: boolean;
  // Agent Lab overrides
  llm_provider?: string;
  model?: string;
  // Agent instance
  agent_instance_id?: string;
}

export interface AgentProviderInfo {
  available: boolean;
  base_url?: string;
  default_model?: string;
  models: string[];
}

export interface AgentProvidersResponse {
  current_provider: string;
  current_model: string;
  providers: {
    ollama: AgentProviderInfo;
    openrouter: AgentProviderInfo;
  };
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
  tokens_in?: number;
  tokens_out?: number;
  tokens_used?: number;
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

export interface AgentTemplate {
  id: string;
  type: string; // 'recepcionista' | 'ventas' | 'soporte' | 'informativo'
  name: string;
  description?: string;
  base_prompt: string;
  tools: string[];
  config_base: { max_iterations?: number; temperature?: number };
  version: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentInstance {
  id: string;
  tenant_id: string;
  template_id: string;
  name: string;
  custom_prompt?: string;
  knowledge_base_id?: string;
  overrides: Record<string, unknown>;
  status: "active" | "paused" | "archived";
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined from template
  template_type?: string;
  template_name?: string;
  template_description?: string;
  tools?: string[];
  config_base?: Record<string, unknown>;
}

export interface AgentInstanceCreate {
  template_id: string;
  name: string;
  custom_prompt?: string;
  knowledge_base_id?: string;
  overrides?: Record<string, unknown>;
}

export interface AgentInstanceUpdate {
  name?: string;
  custom_prompt?: string;
  knowledge_base_id?: string;
  overrides?: Record<string, unknown>;
  status?: "active" | "paused" | "archived";
}

export interface AgentMetricsResponse {
  tenant_id: string;
  avg_iterations: number;
  avg_duration_ms: number;
  total_executions: number;
  error_count: number;
  success_rate: number;
  last_execution?: string;
  /** Admin only: per-tenant breakdown */
  tenant_breakdown?: Array<{
    tenant_id: string;
    total_executions: number;
    avg_duration_ms: number;
    error_count: number;
  }>;
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

// ─── Reports types ────────────────────────────────────────────────────────────

export interface ReportsDailyStat {
  date: string;
  queries: number;
  errors: number;
  avg_ms: number;
  avg_iterations: number;
}

export interface ReportsUsageResponse {
  tenant_id: string;
  start_date: string;
  end_date: string;
  summary: {
    total_queries: number;
    total_errors: number;
    success_rate: number;
    avg_latency_ms: number;
    min_latency_ms: number;
    max_latency_ms: number;
  };
  daily_stats: ReportsDailyStat[];
}

export interface ReportsPerformanceResponse {
  tenant_id: string;
  period: { start: string; end: string };
  kpis: {
    total_queries: number;
    success_rate_pct: number;
    latency_p50_ms: number;
    latency_p95_ms: number;
    avg_iterations: number;
    max_iterations: number;
  };
}

// ─── Notifications types ──────────────────────────────────────────────────────

export interface Notification {
  id: string;
  tenant_id: string;
  user_id?: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

export interface NotificationsListResponse {
  notifications: Notification[];
  unread_count: number;
  total: number;
}

export interface HealthService {
  status: "connected" | "error" | "skipped" | "unreachable";
  message?: string;
}

// ─── Admin Control Plane types ───────────────────────────────────────────────

export interface AdminTenantSummary {
  id: string;
  nombre: string;
  industria: string;
  website?: string;
  user_count: number;
  usage_7d: {
    total_queries: number;
    errors: number;
    avg_latency_ms: number;
    success_rate: number | null;
  };
  last_activity: string | null;
  health: "healthy" | "warning" | "error" | "inactive";
  created_at: string | null;
}

export interface AdminTenantUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  created_at: string | null;
}

export interface AdminTenantTrace {
  trace_id: string;
  query: string;
  finish_reason: string;
  total_ms: number | null;
  had_error: boolean;
  iterations: number | null;
  tokens_in: number | null;
  tokens_out: number | null;
  model: string | null;
  tools: string[];
  created_at: string | null;
}

export interface AdminTenantOverview {
  tenant: {
    id: string;
    nombre: string;
    industria: string;
    website?: string;
    created_at: string | null;
    updated_at: string | null;
  };
  users: AdminTenantUser[];
  usage: {
    queries_today: number;
    queries_7d: number;
    errors_7d: number;
    success_rate_7d: number | null;
    avg_latency_ms_7d: number;
    min_latency_ms_7d: number;
    max_latency_ms_7d: number;
    queries_30d: number;
    errors_30d: number;
    avg_latency_ms_30d: number;
  };
  health: "healthy" | "warning" | "error" | "inactive";
  recent_traces: AdminTenantTrace[];
}

export interface AdminLogsResponse {
  tenant_id: string;
  total: number;
  limit: number;
  offset: number;
  rows: AdminTenantTrace[];
}

export interface AdminGlobalStats {
  total_tenants: number;
  total_active_users: number;
  queries_7d: number;
  queries_today: number;
  errors_7d: number;
  platform_health: "healthy" | "warning" | "error" | "inactive";
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
  private readonly DEFAULT_TIMEOUT_MS = 120_000; // 120 seconds (models like gemma4/qwen3.5 need more time)
  private readonly UPLOAD_TIMEOUT_MS = 120_000; // 120 seconds for file uploads

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    // Server-side: AGENT_SERVICE_URL (never exposed to browser)
    // Client-side: NEXT_PUBLIC_AGENT_SERVICE_URL (must be set in deployment)
    // Fallback: localhost (dev only)
    this.baseUrl = (
      baseUrl ??
      process.env.AGENT_SERVICE_URL ??
      process.env.NEXT_PUBLIC_AGENT_SERVICE_URL ??
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

    /** Admin: fetch traces across all tenants (or filtered by tenantId) */
    tracesAdmin: (opts?: { limit?: number; tenantId?: string }) => {
      const params = new URLSearchParams();
      if (opts?.limit) params.set("limit", String(opts.limit));
      if (opts?.tenantId) params.set("tenant_id", opts.tenantId);
      const qs = params.toString();
      return this.request<AgentTrace[]>(
        "GET",
        `/agent/traces${qs ? `?${qs}` : ""}`,
      );
    },

    metrics: (tenantId?: string) => {
      const qs = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : "";
      return this.request<AgentMetricsResponse>(
        "GET",
        `/agent/metrics/agent${qs}`,
      );
    },

    providers: () =>
      this.request<AgentProvidersResponse>("GET", "/agent/providers"),
  };

  readonly templates = {
    list: (includeInactive = false) =>
      this.request<AgentTemplate[]>(
        "GET",
        `/agent-templates${includeInactive ? "?include_inactive=true" : ""}`,
      ),

    get: (id: string) =>
      this.request<AgentTemplate>("GET", `/agent-templates/${id}`),
  };

  readonly instances = {
    list: (opts?: { tenantId?: string; status?: string }) => {
      const params = new URLSearchParams();
      if (opts?.tenantId) params.set("tenant_id", opts.tenantId);
      if (opts?.status) params.set("status", opts.status);
      const qs = params.toString();
      return this.request<AgentInstance[]>(
        "GET",
        `/agent-instances${qs ? `?${qs}` : ""}`,
      );
    },

    get: (id: string) =>
      this.request<AgentInstance>("GET", `/agent-instances/${id}`),

    create: (body: AgentInstanceCreate, tenantId?: string) => {
      const qs = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : "";
      return this.request<AgentInstance>("POST", `/agent-instances${qs}`, body);
    },

    update: (id: string, body: AgentInstanceUpdate) =>
      this.request<AgentInstance>("PATCH", `/agent-instances/${id}`, body),

    archive: (id: string) =>
      this.request<{ success: boolean; id: string; status: string }>(
        "DELETE",
        `/agent-instances/${id}`,
      ),
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

  // ── Reports ───────────────────────────────────────────────────────────────

  readonly reports = {
    usage: (params?: {
      start_date?: string;
      end_date?: string;
      tenant_id?: string;
    }) => {
      const q = new URLSearchParams(
        (params as Record<string, string>) ?? {},
      ).toString();
      return this.request<ReportsUsageResponse>(
        "GET",
        `/reports/usage${q ? "?" + q : ""}`,
      );
    },

    performance: (params?: {
      start_date?: string;
      end_date?: string;
      tenant_id?: string;
    }) => {
      const q = new URLSearchParams(
        (params as Record<string, string>) ?? {},
      ).toString();
      return this.request<ReportsPerformanceResponse>(
        "GET",
        `/reports/performance${q ? "?" + q : ""}`,
      );
    },

    exportCsvUrl: (
      type: "usage" | "performance" | "traces",
      params?: { start_date?: string; end_date?: string },
    ) => {
      const base = (
        this.baseUrl ??
        process.env.AGENT_SERVICE_URL ??
        "http://localhost:8000"
      ).replace(/\/$/, "");
      const q = new URLSearchParams({
        report_type: type,
        ...(params ?? {}),
      }).toString();
      return `${base}/reports/export/csv?${q}`;
    },
  };

  // ── Notifications ─────────────────────────────────────────────────────────

  readonly notifications = {
    list: (params?: { limit?: number; unread_only?: boolean }) => {
      const q = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params ?? {}).map(([k, v]) => [k, String(v)]),
        ),
      ).toString();
      return this.request<NotificationsListResponse>(
        "GET",
        `/notifications${q ? "?" + q : ""}`,
      );
    },

    markRead: (id: string) =>
      this.request<{ success: boolean }>("PATCH", `/notifications/${id}/read`),

    markAllRead: () =>
      this.request<{ success: boolean }>(
        "POST",
        "/notifications/mark-all-read",
      ),
  };

  // ── Admin Control Plane ───────────────────────────────────────────────────

  readonly admin = {
    /** Global platform stats (tenant count, queries, errors). */
    stats: () => this.request<AdminGlobalStats>("GET", "/admin/stats"),

    /** List all tenants with health + 7d usage summary. */
    tenants: () => this.request<AdminTenantSummary[]>("GET", "/admin/tenants"),

    /** Full overview for a single tenant. */
    tenantOverview: (tenantId: string) =>
      this.request<AdminTenantOverview>(
        "GET",
        `/admin/tenants/${tenantId}/overview`,
      ),

    /** Paginated logs for a tenant. */
    tenantLogs: (
      tenantId: string,
      opts?: {
        limit?: number;
        offset?: number;
        had_error?: boolean;
        finish_reason?: string;
        q?: string;
      },
    ) => {
      const params = new URLSearchParams();
      if (opts?.limit != null) params.set("limit", String(opts.limit));
      if (opts?.offset != null) params.set("offset", String(opts.offset));
      if (opts?.had_error != null)
        params.set("had_error", String(opts.had_error));
      if (opts?.finish_reason) params.set("finish_reason", opts.finish_reason);
      if (opts?.q) params.set("q", opts.q);
      const qs = params.toString();
      return this.request<AdminLogsResponse>(
        "GET",
        `/admin/tenants/${tenantId}/logs${qs ? `?${qs}` : ""}`,
      );
    },
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
