import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { trace, context } from '@opentelemetry/api';

/**
 * Core logging function that bridges Winston, OpenTelemetry and Prisma.
 */
async function log(level: 'info' | 'warn' | 'error', message: string, metadata?: any) {
    const span = trace.getSpan(context.active());
    const traceId = span?.spanContext().traceId;

    // 1. Output to standard logging (Winston -> Console/Sentry)
    logger.log(level, message, { ...metadata, traceId });

    // 2. Persist to Database for the internal observability dashboard
    try {
        await prisma.logEntry.create({
            data: {
                level,
                message,
                traceId,
                metadata: metadata || {},
            },
        });
    } catch (error) {
        // We don't want logger failure to crash the application
        console.warn('[Observability:Logger] Failed to persist log entry:', error);
    }
}

export const info = (msg: string, meta?: any) => log('info', msg, meta);
export const warn = (msg: string, meta?: any) => log('warn', msg, meta);
export const error = (msg: string, meta?: any) => log('error', msg, meta);

/**
 * Business logic logger for high-level events (billing, onboarding, etc.)
 */
export const business = async (message: string, tenantId: string, eventType: string, payload?: any) => {
    return log('info', `[BUSINESS:${eventType}] ${message}`, {
        tenantId,
        eventType,
        ...payload,
    });
};

export const SaaSLogger = {
    info,
    warn,
    error,
    business,
};

export default SaaSLogger;
