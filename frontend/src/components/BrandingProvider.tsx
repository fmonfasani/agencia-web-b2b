"use client";

import React, { useMemo } from "react";

/**
 * Interface representing the branding configuration stored in the Tenant model.
 */
interface BrandingConfig {
    primaryColor?: string;
    sidebarColor?: string;
    accentColor?: string;
    logoUrl?: string;
    appName?: string;
    fontFamily?: string;
    brandingEnabled?: boolean;
}

interface BrandingProviderProps {
    branding: BrandingConfig | null;
    children: React.ReactNode;
}

/**
 * BrandingProvider injects tenant-specific CSS variable overrides based on the
 * database configuration. It allows for a real "white-label" experience by
 * modifying design tokens at runtime.
 */
export default function BrandingProvider({ branding, children }: BrandingProviderProps) {
    const config: BrandingConfig = branding || {};

    const cssVariables = useMemo(() => {
        if (!config.brandingEnabled) return "";

        const variables: string[] = [];

        // Map database branding fields to design system variables
        if (config.primaryColor) {
            variables.push(`--color-primary: ${config.primaryColor};`);
            variables.push(`--color-accent-1: ${config.primaryColor};`);
            variables.push(`--color-text-link: ${config.primaryColor};`);
        }

        if (config.sidebarColor) {
            variables.push(`--color-sidebar-top: ${config.sidebarColor};`);
            // Slightly lighter for gradient mid
            variables.push(`--color-sidebar-mid: ${config.sidebarColor}dd;`);
        }

        if (config.accentColor) {
            variables.push(`--color-accent-2: ${config.accentColor};`);
        }

        if (config.fontFamily) {
            variables.push(`--font-sans: '${config.fontFamily}', ui-sans-serif, system-ui, sans-serif;`);
        }

        return variables.join("\n    ");
    }, [config]);

    return (
        <>
            {cssVariables && (
                <style dangerouslySetInnerHTML={{
                    __html: `
:root {
    ${cssVariables}
}
          `
                }} />
            )}
            {children}
        </>
    );
}
