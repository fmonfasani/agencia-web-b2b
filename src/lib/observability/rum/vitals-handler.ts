import { onCLS, onFID, onLCP, onTTFB, onINP, Metric } from 'web-vitals';
import { rum } from './rum-sdk';

const sendToRum = (metric: Metric) => {
    rum.track(metric.name, metric.value);
};

export const initWebVitals = () => {
    if (typeof window === 'undefined') return;

    onCLS(sendToRum);
    onFID(sendToRum);
    onLCP(sendToRum);
    onTTFB(sendToRum);
    onINP(sendToRum);
};
