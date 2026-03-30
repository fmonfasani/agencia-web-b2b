import { test, expect } from '@playwright/test';

test.describe('Global System Verification (Phases 1-4)', () => {

    test.beforeEach(async ({ page }) => {
        // Navigate to the dashboard (assuming local dev server is running on 3001)
        await page.goto('http://localhost:3001/admin/observability');
    });

    test('Phase 1: Admin Dashboard & Lead Ingestion', async ({ page }) => {
        await page.goto('http://localhost:3001/admin/leads');
        // Check if the verification leads are visible
        // We expect some row to contain 'Verification Lead'
        await expect(page.getByText('Verification Lead 0')).toBeVisible();
    });

    test('Phase 2: AI Software Auditor Integration', async ({ page }) => {
        await page.goto('http://localhost:3001/admin/auditor');
        // Check for auditor header or empty state
        await expect(page.getByText(/Software Auditor|Auditoría/i).first()).toBeVisible();
    });

    test('Phase 3: RUM & Web Vitals Dashboard', async ({ page }) => {
        await page.goto('http://localhost:3001/admin/observability');
        // Check for RUM section (Vitals summary)
        await expect(page.getByText(/Web Vitals|RUM/i).first()).toBeVisible();
        await expect(page.getByText('LCP').first()).toBeVisible();
    });

    test('Phase 4: Analytics Heatmaps & FinOps Anomalies', async ({ page }) => {
        await page.goto('http://localhost:3001/admin/observability');

        // Check for Heatmap component presence (text or markers)
        await expect(page.getByText(/Heatmap|Distribución Geográfica/i).first()).toBeVisible();

        // Check for FinOps section and Anomaly alerts
        await expect(page.getByText(/FinOps|Costos API/i).first()).toBeVisible();
        // The anomaly alert usually has a warning icon or specific text
        await expect(page.getByText(/Anomaly|Critical|⚠️/i).first()).toBeVisible();
    });

});
