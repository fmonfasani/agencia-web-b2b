'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { rum } from '@/lib/observability/rum/rum-sdk';
import { initWebVitals } from '@/lib/observability/rum/vitals-handler';

const RumContext = createContext(rum);

export const RumProvider = ({ children, userId }: { children: React.ReactNode; userId?: string }) => {
    useEffect(() => {
        // Initialize Web Vitals capture
        initWebVitals();

        // Track initial page view
        rum.track('page_view', 1, userId);

        return () => {
            // Optional: final flush on unmount
            rum.flush();
        };
    }, [userId]);

    return (
        <RumContext.Provider value={rum}>
            {children}
        </RumContext.Provider>
    );
};

export const useRum = () => useContext(RumContext);
