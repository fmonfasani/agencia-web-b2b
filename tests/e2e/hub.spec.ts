import { test, expect } from '@playwright/test';

/**
 * Terminal Comercial Hub E2E Tests
 * Part of the "Testing Army" suite.
 */
test.describe('Terminal Comercial Hub', () => {

    test.beforeEach(async ({ page }) => {
        // 1. Visit Sign In
        await page.goto('/es/auth/sign-in');

        // 2. Login as the main user (using the recently reset password)
        // Note: In a CI environment, we'd use environment variables.
        await page.getByPlaceholder('admin@agencia.com').fill('fmonfasani@gmail.com');
        await page.locator('input[type="password"]').fill('Kara3010');
        await page.click('button[type="submit"]');

        // 3. Wait for dashboard redirection
        // We use a regex to match the locale-prefixed admin path
        await expect(page).toHaveURL(/\/[a-z]{2}\/admin\/dashboard/, { timeout: 15000 });
    });

    test('should display the Commercial Hub header and proprietary labels', async ({ page }) => {
        // Assert the main title
        await expect(page.locator('h1')).toContainText('Terminal Comercial Hub');

        // Assert proprietary engine labels
        await expect(page.getByText('Proprietary Data')).toBeVisible();
        await expect(page.getByText('V2.5 Engine')).toBeVisible();
    });

    test('should display all core metric cards with correct titles', async ({ page }) => {
        const expectedMetrics = [
            'Pipeline Value',
            'Intelligence Coverage',
            'Lead Quality Avg',
            'Efficiency Score',
            'Net Profit (Unit)'
        ];

        for (const metric of expectedMetrics) {
            await expect(page.getByText(metric)).toBeVisible();
        }
    });

    test('should render the Master Intelligence Base table', async ({ page }) => {
        await expect(page.getByText('Base Maestra de Inteligencia')).toBeVisible();

        // Verify the LeadsDataTable is Present (contains headers like "Empresa", "Contacto", etc.)
        const table = page.locator('table');
        await expect(table).toBeVisible();

        // Check for common lead headers
        await expect(table).toContainText(/Empresa|Company/i);
    });

    test('should have an active "Lanzar Discovery" action button', async ({ page }) => {
        const discoveryBtn = page.getByRole('link', { name: /Lanzar Discovery/i });
        await expect(discoveryBtn).toBeVisible();

        // Navigate and verify Discovery page (Scraper)
        await discoveryBtn.click();
        await expect(page).toHaveURL(/\/[a-z]{2}\/admin\/dashboard\/scraper/);

        // Basic check for Scraper UI
        await expect(page.locator('h1')).toContainText(/Explorador|Discovery/i);
    });
});
