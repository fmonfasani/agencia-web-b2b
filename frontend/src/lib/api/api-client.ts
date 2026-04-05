/**
 * lib/api/client.ts
 *
 * HTTP Client wrapper que automáticamente:
 * - Añade X-API-Key header si existe
 * - Maneja errores comunes
 * - Tipos seguros con TypeScript
 */

export type RequestOptions = RequestInit & {
  timeout?: number;
  skipAuth?: boolean;
};

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
};

class ApiClient {
  private baseUrl: string;
  private timeout: number = 30000;

  constructor(baseUrl: string, timeout?: number) {
    this.baseUrl = baseUrl;
    if (timeout) this.timeout = timeout;
  }

  /**
   * Obtener API Key del sessionStorage
   */
  private getApiKey(): string | null {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("api_key");
  }

  /**
   * Construir headers con X-API-Key automáticamente
   */
  private buildHeaders(options: RequestOptions): HeadersInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    // Agregar X-API-Key si existe y no lo saltamos
    if (!options.skipAuth) {
      const apiKey = this.getApiKey();
      if (apiKey) {
        headers["X-API-Key"] = apiKey;
      }
    }

    return headers;
  }

  /**
   * Wrapper para fetch con timeout y manejo de errores
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestOptions = {},
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options.timeout || this.timeout,
    );

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: this.buildHeaders(options),
      });

      clearTimeout(timeout);
      return response;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T = any>(
    endpoint: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await this.fetchWithTimeout(url, {
        ...options,
        method: "GET",
      });

      if (!response.ok) {
        if (response.status === 401) {
          // API Key inválida o expirada
          sessionStorage.removeItem("api_key");
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
        }
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
        };
      }

      const data = await response.json();
      return { success: true, data, status: response.status };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        status: 0,
      };
    }
  }

  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    body?: any,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await this.fetchWithTimeout(url, {
        ...options,
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        if (response.status === 401) {
          sessionStorage.removeItem("api_key");
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
        }
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.detail || `HTTP ${response.status}`,
          status: response.status,
        };
      }

      const data = await response.json();
      return { success: true, data, status: response.status };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        status: 0,
      };
    }
  }

  /**
   * PUT request
   */
  async put<T = any>(
    endpoint: string,
    body?: any,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await this.fetchWithTimeout(url, {
        ...options,
        method: "PUT",
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}`,
          status: response.status,
        };
      }

      const data = await response.json();
      return { success: true, data, status: response.status };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        status: 0,
      };
    }
  }

  /**
   * DELETE request
   */
  async delete<T = any>(
    endpoint: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await this.fetchWithTimeout(url, {
        ...options,
        method: "DELETE",
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}`,
          status: response.status,
        };
      }

      const data = await response.json().catch(() => ({}));
      return { success: true, data, status: response.status };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        status: 0,
      };
    }
  }
}

// Crear instancias para cada backend
const saasUrl = process.env.NEXT_PUBLIC_SAAS_API_URL || "http://localhost:8000";
const agentsUrl =
  process.env.NEXT_PUBLIC_AGENTS_API_URL || "http://localhost:8001";
const timeout = parseInt(process.env.NEXT_PUBLIC_REQUEST_TIMEOUT || "30000");

export const saasClient = new ApiClient(saasUrl, timeout);
export const agentsClient = new ApiClient(agentsUrl, timeout);

// Re-export para conveniencia
export default saasClient;
