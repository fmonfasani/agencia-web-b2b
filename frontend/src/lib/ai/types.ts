export interface AIProvider {
  name: string;
  generateResponse(
    messages: Array<{ role: string; content: string }>,
    tenantId?: string,
    options?: Record<string, unknown>,
  ): Promise<string | null>;
  isAvailable(): boolean;
}

export interface AIResponse {
  content: string;
  provider: string;
  usage?: Record<string, unknown>;
}
