export interface AIProvider {
    name: string;
    generateResponse(messages: any[], options?: any): Promise<string | null>;
    isAvailable(): boolean;
}

export interface AIResponse {
    content: string;
    provider: string;
    usage?: any;
}
