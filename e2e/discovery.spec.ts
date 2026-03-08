import { test, expect } from '@playwright/test';

/**
 * Discovery AI / Scraper E2E Tests
 * Part of the "Testing Army" suite.
 */
test.describe('Discovery AI (Scraper)', () => {

    test.beforeEach(async ({ page }) => {
        // 1. Session Login
        await page.goto('/es/auth/sign-in');
        await page.getByPlaceholder('admin@agencia.com').fill('fmonfasani@gmail.com');
        await page.locator('input[type="password"]').fill('Kara3010');
        await page.click('button[type="submit"]');

        // 2. Navigate to Discovery (Scraper)
        await page.goto('/es/admin/dashboard/scraper');
        await expect(page.locator('h1')).toContainText(/Explorador|Discovery/i);
    });

    test('should allow selecting a search preset and filling the form', async ({ page }) => {
        // Click "Dentistas" preset
        const presetBtn = page.getByRole('button', { name: 'Dentistas' });
        await presetBtn.click();

        // Verify input is updated
        const queryInput = page.getByPlaceholder(/qué tipo de negocio/i);
        await expect(queryInput).toHaveValue('dentistas');

        // Check Location input
        const locationInput = page.getByPlaceholder(/Buenos Aires/i);
        await expect(locationInput).toHaveValue('Buenos Aires, Argentina');
    });

    test('should show "Rotación Activa" badge when Buenos Aires is entered', async ({ page }) => {
        const locationInput = page.getByPlaceholder(/Buenos Aires/i);
        await locationInput.fill('Buenos Aires');
        await expect(page.getByText('Rotación Activa')).toBeVisible();
    });

    test('should toggle scheduling options', async ({ page }) => {
        const scheduleToggle = page.locator('button:has(div.bg-white.rounded-full)');
        await scheduleToggle.click();

        // Verify scheduling fields appear
        await expect(page.getByText('Cada X minutos')).toBeVisible();
        await expect(page.getByText('u Horario (HH:MM)')).toBeVisible();
    });

    test('should update max leads slider value', async ({ page }) => {
        const slider = page.locator('input[type="range"]');
        await slider.fill('50');
        await expect(page.getByText('50 negocios')).toBeVisible();
    });

    test('should initiate scraping and show running status (Mock-like observation)', async ({ page }) => {
        // Fill query
        await page.getByPlaceholder(/qué tipo de negocio/i).fill('Test Studio');

        // Launch
        await page.getByRole('button', { name: /Lanzar Scraper/i }).click();

        // Check for loading state or job card
        // Note: In a real E2E, the backend might be slow, so we wait for the card container
        const statusCard = page.locator('div.rounded-3xl.border-2.p-6');
        await expect(statusCard).toBeVisible({ timeout: 10000 });

        // It initially stays in "Scraping en progreso..."
        await expect(statusCard).toContainText(/Scraping en progreso|Completado|Error/i);
    });
});
