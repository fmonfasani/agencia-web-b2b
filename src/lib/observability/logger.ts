import { prisma } from "@/lib/prisma";

export type LogLevel = "INFO" | "WARN" | "ERROR" | "FATAL" | "DEBUG";

interface LogContext {
    tenantId?: string;
    userId?: string;
    requestId?: string;
    traceId?: string;
}

/**
 * Enterprise-grade logger for Revenue OS.
 * Designed for structured logging and scalability.
 */
export class SaaSLogger {
    private static format(level: LogLevel, message: string, context?: LogContext, meta?: any) {
        const payload = {
            timestamp: new Date().toISOString(),
            level,
            message,
            tenantId: context?.tenantId,
            userId: context?.userId,
            requestId: context?.requestId,
            traceId: context?.traceId,
            ...meta,
        };

        // En producción, esto iría a stdout en formato JSON para Grafana Loki/Datadog
        return JSON.stringify(payload);
    }

    static info(message: string, context?: LogContext, meta?: any) {
        console.log(this.format("INFO", message, context, meta));
    }

    static error(message: string, context?: LogContext, meta?: any) {
        console.error(this.format("ERROR", message, context, meta));
    }

    static warn(message: string, context?: LogContext, meta?: any) {
        console.warn(this.format("WARN", message, context, meta));
    }

    static debug(message: string, context?: LogContext, meta?: any) {
        if (process.env.NODE_ENV === "development") {
            console.debug(this.format("DEBUG", message, context, meta));
        }
    }

    /**
     * Special method to log to the database business events table
     * while also logging to the standard stream.
     */
    static async business(message: string, tenantId: string, type: string, payload: any) {
        this.info(`[Business Event] ${type}: ${message}`, { tenantId }, { payload });

        try {
            await prisma.businessEvent.create({
                data: {
                    tenantId,
                    type,
                    payload,
                    source: "system",
                },
            });
        } catch (err) {
            this.error("Failed to persist business event to DB", { tenantId }, { originalError: err });
        }
    }
}
