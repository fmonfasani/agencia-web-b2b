/**
 * OpenTelemetry SDK Configuration
 * Safe for Next.js build-time and runtime.
 */

export const initOtel = async () => {
    // Only run on Node.js runtime and when not in browser
    if (typeof window !== 'undefined' || process.env.NEXT_RUNTIME !== 'nodejs') {
        return null;
    }

    try {
        const { NodeSDK } = await import('@opentelemetry/sdk-node');
        const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node');
        const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');

        // Defensive import for Resource to handle different export patterns across versions
        const resourcesModule: any = await import('@opentelemetry/resources');
        const Resource = resourcesModule.Resource || resourcesModule.default?.Resource || resourcesModule.default;

        if (!Resource || typeof Resource !== 'function') {
            throw new Error('Resource class not found or invalid in @opentelemetry/resources');
        }

        // Handle potential different import paths for semantic conventions across versions
        const semconv = await import('@opentelemetry/semantic-conventions').catch(() => null);
        const SERVICE_NAME = semconv?.SemanticResourceAttributes?.SERVICE_NAME || 'service.name';
        const SERVICE_VERSION = semconv?.SemanticResourceAttributes?.SERVICE_VERSION || 'service.version';

        let resource;
        try {
            resource = new Resource({
                [SERVICE_NAME]: 'agencia-web-b2b-frontend',
                [SERVICE_VERSION]: '1.0.0',
            });
        } catch (resError) {
            console.warn('[Observability:OTEL] Resource instantiation failed, using default:', resError);
            // Fallback to a plain object or simpler resource if possible
            resource = undefined;
        }

        const sdk = new NodeSDK({
            resource: resource,
            traceExporter: new OTLPTraceExporter({
                url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
            }),
            instrumentations: [
                getNodeAutoInstrumentations({
                    // Disable fs instrumentation to avoid noise in Next.js build/dev
                    '@opentelemetry/instrumentation-fs': { enabled: false },
                }),
            ],
        });

        return sdk;
    } catch (error) {
        console.error('[Observability:OTEL] Critical error initializing OpenTelemetry:', error);
        return null;
    }
};

// For backward compatibility with instrumentation.ts
export default {
    start: async () => {
        const sdk = await initOtel();
        if (sdk) {
            sdk.start();
        }
    }
};
