import { test, expect } from "@playwright/test";

test.describe("Contact Form Tests", () => {
  test("should show validation for empty form", async ({ page }) => {
    await page.goto("/#contacto");

    // Wait for form to be visible
    await expect(page.getByLabel(/nombre colaborador/i)).toBeVisible();

    // Try to submit without filling form
    await page.getByRole("button", { name: /enviar consulta/i }).click();

    // Browser native validation will prevent submission
    const nameInput = page.getByLabel(/nombre colaborador/i);
    await expect(nameInput).toBeFocused();
  });

  test("should successfully submit contact form", async ({ page }) => {
    await page.goto("/#contacto");

    // Fill out the form
    await page.getByLabel(/nombre colaborador/i).fill("E2E Test User");
    await page.getByLabel(/email corporativo/i).fill("test@e2e.com");
    await page
      .getByLabel(/mensaje/i)
      .fill("This is an automated E2E test message");

    // Submit form
    await page.getByRole("button", { name: /enviar consulta/i }).click();

    // Check for success message
    await expect(page.getByText(/consulta enviada/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("WhatsApp button should open in new tab", async ({ context, page }) => {
    await page.goto("/");

    // Wait for WhatsApp button
    const whatsappButton = page.getByLabel(/chat on whatsapp/i);
    await expect(whatsappButton).toBeVisible();

    // Check it has correct attributes
    await expect(whatsappButton).toHaveAttribute("target", "_blank");
    await expect(whatsappButton).toHaveAttribute("rel", /noopener noreferrer/);

    // Verify URL structure (don't actually click to external site)
    const href = await whatsappButton.getAttribute("href");
    expect(href).toContain("wa.me");
  });
});
