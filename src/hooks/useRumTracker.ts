'use client';

import { useRum } from '@/components/providers/RumProvider';
import { useCallback } from 'react';

export const useRumTracker = () => {
    const rum = useRum();

    const trackInteraction = useCallback((name: string, value: number = 1, userId?: string) => {
        rum.track(`interaction_${name}`, value, userId);
    }, [rum]);

    const trackTiming = useCallback(async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
        const start = performance.now();
        try {
            const result = await fn();
            const end = performance.now();
            rum.track(`timing_${name}`, end - start);
            return result;
        } catch (error) {
            const end = performance.now();
            rum.track(`error_${name}`, end - start);
            throw error;
        }
    }, [rum]);

    return { trackInteraction, trackTiming };
};
