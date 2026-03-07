import { describe, expect, it } from "vitest";
import { authConfig } from "@/auth.config";

describe("OAuth provider security config", () => {
  it("disables dangerous email account linking", () => {
    const serialized = JSON.stringify(authConfig);
    const token = '"allowDangerousEmailAccountLinking":false';
    const occurrences = serialized.split(token).length - 1;

    expect(occurrences).toBeGreaterThanOrEqual(2);
  });
});
