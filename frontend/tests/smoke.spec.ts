import { test, expect } from '@playwright/test'

test('login page should load', async ({ page }) => {
    await page.goto('http://localhost:3001/es/login')

    await expect(page).toHaveTitle(/.*/)

    // Verifica que NO sea 404
    const content = await page.content()
    expect(content).not.toContain('404')
})