export interface AIProvider {
    name: string;
    generateResponse(messages: any[], tenantId?: string, options?: any): Promise<string | null>;
    isAvailable(): boolean;
}

export interface AIResponse {
    content: string;
    provider: string;
    usage?: any;
}
