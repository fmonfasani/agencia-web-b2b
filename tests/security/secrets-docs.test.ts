import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("security docs hygiene", () => {
  it("README does not contain exposed real secret values", () => {
    const readme = readFileSync(join(process.cwd(), "README.md"), "utf-8");

    expect(readme).not.toMatch(/x-admin-secret:\s*[A-Za-z0-9_-]{8,}/i);
    expect(readme).not.toMatch(/ssh\s+root@\d{1,3}(?:\.\d{1,3}){3}/i);
    expect(readme).toContain("<REPLACE_WITH_ACTUAL_VALUE>");
    expect(readme).toContain("Nunca se deben commitear secrets");
  });

  it(".env.example contains required empty keys", () => {
    const envExample = readFileSync(join(process.cwd(), ".env.example"), "utf-8");
    const required = [
      "OPENAI_API_KEY=",
      "ASSISTANT_ID=",
      "OLD_ASSISTANT_ID=",
      "AUTH_GOOGLE_ID=",
      "AUTH_GOOGLE_SECRET=",
      "AUTH_SECRET=",
      "NEXTAUTH_URL=",
      "AUTH_TRUST_HOST=",
      "DATABASE_URL=",
      "POSTGRES_PRISMA_URL=",
      "POSTGRES_URL_NON_POOLING=",
      "ADMIN_SECRET=",
      "AGENT_SERVICE_URL=",
      "INTERNAL_API_SECRET=",
      "NEXT_PUBLIC_SENTRY_DSN=",
      "SENTRY_AUTH_TOKEN=",
    ];

    for (const key of required) {
      expect(envExample).toContain(key);
    }
  });
});
