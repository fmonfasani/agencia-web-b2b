export const initWebVitals = async () => {
    if (typeof window === 'undefined') return;

    try {
        const vitals: any = await import('web-vitals');
        const { rum } = await import('./rum-sdk');

        const sendToRum = (metric: any) => {
            rum.track(metric.name, metric.value);
        };

        // Use safe access as web-vitals API might vary between versions
        if (vitals.onCLS) vitals.onCLS(sendToRum);
        if (vitals.onLCP) vitals.onLCP(sendToRum);
        if (vitals.onTTFB) vitals.onTTFB(sendToRum);
        if (vitals.onINP) vitals.onINP(sendToRum);
        if (vitals.onFCP) vitals.onFCP(sendToRum);
        // onFID is deprecated in favor of onINP in newer web-vitals
    } catch (error) {
        console.warn('[Rum:WebVitals] Failed to load web-vitals library:', error);
    }
};
