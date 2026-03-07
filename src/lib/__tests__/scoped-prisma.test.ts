import { beforeEach, describe, expect, it, vi } from "vitest";
import { getScopedPrisma } from "../scoped-prisma";
import { getTenantPrisma } from "../prisma";
import { logger } from "../logger";

vi.mock("../prisma", () => ({
  getTenantPrisma: vi.fn(),
}));

vi.mock("../logger", () => ({
  logger: {
    warn: vi.fn(),
  },
}));

describe("getScopedPrisma", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when context is missing", async () => {
    await expect(getScopedPrisma()).rejects.toThrow("TENANT_CONTEXT_REQUIRED");
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it("returns tenant prisma when context is valid", async () => {
    const scopedClient = { lead: { findMany: vi.fn() } };
    (getTenantPrisma as any).mockReturnValue(scopedClient);

    const result = await getScopedPrisma({ userId: "user-1", tenantId: "tenant-1" });

    expect(result).toBe(scopedClient);
    expect(getTenantPrisma).toHaveBeenCalledWith("tenant-1");
  });
});
