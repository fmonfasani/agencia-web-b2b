export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // We import dynamically to avoid loading OTEL in the edge runtime or browser
        const { default: sdk } = await import('./lib/observability/otel');

        try {
            sdk.start();
            console.log('--- [Observability] OpenTelemetry SDK Started (Node.js) ---');
        } catch (error) {
            console.error('--- [Observability] Failed to start OpenTelemetry SDK:', error);
        }
    }
}
