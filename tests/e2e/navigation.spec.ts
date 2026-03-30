import { test, expect } from "@playwright/test";

test.describe("Navigation Tests", () => {
  test("should navigate from home to pricing and back", async ({ page }) => {
    await page.goto("/");

    // Check we're on home page
    await expect(page.getByText("Convertí tu web en una")).toBeVisible();

    // Navigate to pricing
    await page.getByRole("link", { name: "Precios" }).click();
    await expect(page).toHaveURL("/pricing");
    await expect(page.getByText("Precios Transparentes")).toBeVisible();

    // Navigate back to home via logo
    await page.getByRole("link", { name: "Agencia Web" }).first().click();
    await expect(page).toHaveURL("/");
  });

  test("should scroll to sections using hash links", async ({ page }) => {
    await page.goto("/");

    // Click on Servicios nav item
    await page.getByRole("link", { name: "Servicios" }).click();

    // Check that servicios section is in viewport
    const serviciosSection = page.locator("#servicios");
    await expect(serviciosSection).toBeInViewport();
  });

  test("mobile menu should work correctly", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Mobile menu should be closed initially
    const mobileNav = page.locator("text=Servicios").nth(1); // Second instance (mobile)
    await expect(mobileNav).not.toBeVisible();

    // Open mobile menu
    await page.getByRole("button", { name: /menu/i }).click();
    await expect(mobileNav).toBeVisible();

    // Close menu
    await page.getByRole("button", { name: /close/i }).click();
    await expect(mobileNav).not.toBeVisible();
  });
});
