import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3001";

test("minimum production flow: login -> execute -> usage -> billing", async ({ page }) => {
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, "E2E credentials not configured");

  await page.goto(`${BASE_URL}/es/auth/sign-in`);
  await page.getByLabel(/email/i).fill(process.env.E2E_EMAIL!);
  await page.getByLabel(/password/i).fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: /ingresar|sign in/i }).click();

  await page.goto(`${BASE_URL}/es/admin/dashboard`);
  await expect(page.getByText("Webshooks Control Center")).toBeVisible();

  await page.getByRole("button", { name: "Test manual" }).click();

  await expect(page.getByText("Usage")).toBeVisible();
  await expect(page.getByText("Billing")).toBeVisible();
});
