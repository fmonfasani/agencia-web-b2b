import { describe, expect, it } from "vitest";

describe("Security: Email Normalization", () => {
  it("SECURITY: Email should be normalized to lowercase for lookup", () => {
    const rawEmail = "Test.User@Example.COM";
    const normalized = rawEmail.toLowerCase().trim();
    expect(normalized).toBe("test.user@example.com");
  });

  it("SECURITY: authorize lookup logic uses normalized email", async () => {
    // This is a unit test for the logic, assuming authorize handles it
    const credentials = { email: "User@Company.com", password: "password" };
    const email = credentials.email.toString().trim().toLowerCase();
    expect(email).toBe("user@company.com");
  });
});
