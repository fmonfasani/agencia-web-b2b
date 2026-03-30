import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'Password123!';

    test('should register a new company and redirect to dashboard', async ({ page }) => {
        // 1. Navigate to register page (using English for consistency in test)
        await page.goto('/en/auth/register-company');

        // 2. Fill the form
        await page.getByPlaceholder('John').fill('Test');
        await page.getByPlaceholder('Smith').fill('User');
        await page.getByPlaceholder('john@company.com').fill(testEmail);
        await page.getByPlaceholder('Mi Agencia SRL').fill('Test Agency LLC');

        // Passwords
        const passwordFields = page.locator('input[type="password"]');
        await passwordFields.nth(0).fill(testPassword);
        await passwordFields.nth(1).fill(testPassword);

        // 3. Submit
        await page.click('button[type="submit"]');

        // 4. Verify redirection to dashboard
        // The registration might take a few seconds as it connects to DigitalOcean
        await expect(page).toHaveURL(/\/en\/admin\/dashboard/, { timeout: 15000 });

        // 5. Verify presence of Dashboard content
        await expect(page.locator('h1')).toContainText(/Dashboard|Executive View/i);
    });

    test('should protect admin routes from unauthorized users', async ({ page }) => {
        // Try to access admin without session
        await page.goto('/en/admin/dashboard');

        // Should redirect to sign-in or show 401/403
        // According to our authz.ts logic, it throws an error which might be handled by Next.js
        // Let's expect a redirect to sign-in
        await expect(page).toHaveURL(/\/en\/auth\/sign-in/);
    });
});
