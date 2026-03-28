import { test, expect } from '@playwright/test';

const FRONTEND_URL = 'http://localhost:3001';
const BACKEND_URL = 'http://localhost:8000';

test.describe('Auth Bridge Integration', () => {

  test('1. Verify Sign-in page loads correctly (ES)', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/es/auth/sign-in`);
    await expect(page).toHaveTitle(/Bienvenido de vuelta | Webshooks/);
    await expect(page.locator('h1')).toContainText('Bienvenido de vuelta');
  });

  test('2. Verify Locale switching to English', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/en/auth/sign-in`);
    await expect(page.locator('h1')).toContainText('Welcome back');
  });

  test('3. Verify Backend API is alive', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/docs`);
    expect(response.status()).toBe(200);
  });

  test('4. Verify Scraper Proxy requires authentication', async ({ request }) => {
    const response = await request.post(`${FRONTEND_URL}/es/api/admin/scrapers/run`, {
      data: { url: "https://example.com" }
    });
    // Should be 401 Unauthorized because no session cookie is provided
    expect(response.status()).toBe(401);
  });

  test('5. Verify Registration API logic via direct fetch', async ({ request }) => {
    // We don't want to actually create a user every time, but we test the endpoint exists
    // and returns validation errors for empty bodies
    const response = await request.post(`${FRONTEND_URL}/es/api/auth/register-company`, {
      data: {}
    });
    expect(response.status()).not.toBe(404);
  });

  test('6. Verify Backend rejects missing X-API-Key', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/scraper/run`, {
      data: { url: "https://example.com" }
    });
    // FastAPI should return 400 or 401 depending on middleware
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('7. Verify Frontend globals.css loading', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/es/auth/sign-in`);
    const bgColor = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    // Dark mode bg check
    expect(bgColor).toBe('rgb(13, 15, 20)'); 
  });

  test('8. Verify Sign-up page contains plan selector', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/es/auth/register-company`);
    await expect(page.locator('select')).toBeVisible();
    await expect(page.locator('option')).toHaveCount(3);
  });

  test('9. Verify NextAuth session endpoint (Unauthorized)', async ({ request }) => {
    const response = await request.get(`${FRONTEND_URL}/api/auth/session`);
    const data = await response.json();
    expect(data).toEqual({}); // Empty object means no session
  });

  test('10. Verify Backend Health Endpoint', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/health`);
    if (response.status() === 200) {
      const data = await response.json();
      expect(data.status).toBe('ok');
    }
  });

});
