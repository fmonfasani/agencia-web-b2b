import { trace, Span, SpanStatusCode, context } from '@opentelemetry/api';

const tracer = trace.getTracer('agencia-web-b2b-frontend');

/**
 * Starts a new span.
 */
export const startSpan = (name: string, attributes?: Record<string, any>) => {
    return tracer.startSpan(name, { attributes });
};

/**
 * Ends a span with a specific status.
 */
export const endSpan = (span: Span, status: 'ok' | 'error' = 'ok') => {
    span.setStatus({ code: status === 'ok' ? SpanStatusCode.OK : SpanStatusCode.ERROR });
    span.end();
};

/**
 * Executes a function within a new span.
 */
export async function withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    attributes?: Record<string, any>
): Promise<T> {
    const span = startSpan(name, attributes);
    try {
        const result = await fn(span);
        endSpan(span, 'ok');
        return result;
    } catch (error) {
        endSpan(span, 'error');
        if (error instanceof Error) {
            span.recordException(error);
        }
        throw error;
    }
}

export { tracer };
