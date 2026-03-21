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
    const envExample = readFileSync(
      join(process.cwd(), ".env.example"),
      "utf-8",
    );
    const required = [
      "AUTH_SECRET=",
      "NEXTAUTH_URL=",
      "AUTH_TRUST_HOST=",
      "DATABASE_URL=",
      "POSTGRES_PRISMA_URL=",
      "POSTGRES_URL_NON_POOLING=",
      "INTERNAL_API_SECRET=",
      "ADMIN_SECRET=",
      "AUTH_GOOGLE_ID=",
      "AUTH_GOOGLE_SECRET=",
      "AUTH_MICROSOFT_ENTRA_ID_ID=",
      "AUTH_MICROSOFT_ENTRA_ID_SECRET=",
      "AUTH_MICROSOFT_ENTRA_ID_ISSUER=",
      "UPSTASH_REDIS_REST_URL=",
      "UPSTASH_REDIS_REST_TOKEN=",
      "AGENT_SERVICE_URL=",
      "BRIDGE_API_KEY=",
      "OPENAI_API_KEY=",
      "SENTRY_AUTH_TOKEN=",
    ];

    for (const key of required) {
      expect(envExample).toContain(key);
    }
  });
});
