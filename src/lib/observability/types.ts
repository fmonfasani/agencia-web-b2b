export interface TraceEvent {
    traceId: string;
    spanId: string;
    service: string;
    operation: string;
    startTime: number;
    endTime?: number;
    status: "ok" | "error";
    metadata?: Record<string, any>;
}

export interface MetricEvent {
    name: string;
    value: number;
    timestamp: number;
    tags?: Record<string, string>;
}

export interface LogEvent {
    level: "info" | "warn" | "error";
    message: string;
    timestamp: number;
    traceId?: string;
    metadata?: Record<string, any>;
}
