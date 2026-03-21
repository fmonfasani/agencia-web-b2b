import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("Security: Password Hashing Integrity", () => {
  it("SECURITY: hashPassword creates non-empty hash", () => {
    const hash = hashPassword("testPassword123");
    expect(hash).toBeTruthy();
    expect(hash.length).toBeGreaterThan(20);
    expect(hash).not.toBe("testPassword123");
  });

  it("SECURITY: verifyPassword validates correct password", () => {
    const password = "MySecurePassword123!";
    const hash = hashPassword(password);
    expect(verifyPassword(password, hash)).toBe(true);
  });

  it("SECURITY: verifyPassword rejects incorrect password", () => {
    const hash = hashPassword("CorrectPassword");
    expect(verifyPassword("WrongPassword", hash)).toBe(false);
    expect(verifyPassword("", hash)).toBe(false);
  });

  it("SECURITY: verifyPassword handles null/empty hash", () => {
    expect(verifyPassword("password", null)).toBe(false);
    expect(verifyPassword("password", undefined)).toBe(false);
    expect(verifyPassword("password", "")).toBe(false);
  });

  it("SECURITY: verifyPassword handles empty password", () => {
    const hash = hashPassword("SomePassword");
    expect(verifyPassword("", hash)).toBe(false);
  });

  it("SECURITY: Same password produces different hashes (salt)", () => {
    const password = "TestPassword";
    const hash1 = hashPassword(password);
    const hash2 = hashPassword(password);
    expect(hash1).not.toBe(hash2);
  });

  it("SECURITY: Hash format includes salt (scrypt format)", () => {
    const hash = hashPassword("password");
    const parts = hash.split(":");
    expect(parts.length).toBe(2);
    expect(parts[0]).toBeTruthy();
    expect(parts[1]).toBeTruthy();
  });
});

describe("Security: API Auth Secret Validation", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.INTERNAL_API_SECRET;
  });

  it("SECURITY: validateInternalSecret returns false when env is missing", async () => {
    const { validateInternalSecret } = await import("@/lib/api-auth");
    delete process.env.INTERNAL_API_SECRET;

    const mockRequest = new Request("http://localhost", {
      headers: { "x-internal-secret": "any-token" },
    });

    expect(validateInternalSecret(mockRequest)).toBe(false);
  });

  it("SECURITY: validateInternalSecret validates correct secret", async () => {
    const { validateInternalSecret } = await import("@/lib/api-auth");
    process.env.INTERNAL_API_SECRET = "my-super-secret-key-12345";

    const mockRequest = new Request("http://localhost", {
      headers: { "x-internal-secret": "my-super-secret-key-12345" },
    });

    expect(validateInternalSecret(mockRequest)).toBe(true);
  });

  it("SECURITY: validateInternalSecret rejects wrong secret", async () => {
    const { validateInternalSecret } = await import("@/lib/api-auth");
    process.env.INTERNAL_API_SECRET = "correct-secret";

    const mockRequest = new Request("http://localhost", {
      headers: { "x-internal-secret": "wrong-secret" },
    });

    expect(validateInternalSecret(mockRequest)).toBe(false);
  });

  it("SECURITY: validateInternalSecret supports Bearer token", async () => {
    const { validateInternalSecret } = await import("@/lib/api-auth");
    process.env.INTERNAL_API_SECRET = "bearer-secret";

    const mockRequest = new Request("http://localhost", {
      headers: { Authorization: "Bearer bearer-secret" },
    });

    expect(validateInternalSecret(mockRequest)).toBe(true);
  });

  it("SECURITY: No hardcoded fallback in requireInternalSecret", async () => {
    delete process.env.INTERNAL_API_SECRET;

    const { requireInternalSecret } = await import("@/lib/api-auth");

    const mockRequest = new Request("http://localhost", {
      headers: { "x-internal-secret": "any-token" },
    });

    expect(() => requireInternalSecret(mockRequest)).toThrow();
  });
});

describe("Security: Session Cookie Configuration", () => {
  it("SECURITY: getSessionCookieOptions returns secure flags", async () => {
    process.env.NODE_ENV = "production";
    const { getSessionCookieOptions, SESSION_COOKIE_NAME } =
      await import("@/lib/security/cookies");

    expect(SESSION_COOKIE_NAME).toBe("session");

    const options = getSessionCookieOptions(new Date(Date.now() + 3600000));
    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(true);
    expect(options.sameSite).toBe("lax");
  });

  it("SECURITY: getClearSessionCookieOptions sets maxAge to 0", async () => {
    const { getClearSessionCookieOptions } =
      await import("@/lib/security/cookies");

    const options = getClearSessionCookieOptions();
    expect(options.maxAge).toBe(0);
    expect(options.httpOnly).toBe(true);
  });
});
