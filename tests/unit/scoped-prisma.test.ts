import { beforeEach, describe, expect, it, vi } from "vitest";
import { getScopedPrisma } from "@/lib/scoped-prisma";
import { getTenantPrisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

vi.mock("@/lib/prisma", () => ({
  getTenantPrisma: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
  },
}));

describe("getScopedPrisma", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Caso 1: sin ctx lanza error", async () => {
    await expect(getScopedPrisma()).rejects.toThrow("TENANT_CONTEXT_REQUIRED");
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it("Caso 2: con ctx incompleto lanza error", async () => {
    await expect(getScopedPrisma({ userId: "user-1" })).rejects.toThrow(
      "TENANT_CONTEXT_REQUIRED",
    );
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it("Caso 3: con ctx valido devuelve cliente scoped", async () => {
    const scopedClient = { lead: { findMany: vi.fn() } };
    vi.mocked(getTenantPrisma).mockReturnValue(scopedClient as any);

    const result = await getScopedPrisma({ userId: "user-1", tenantId: "tenant-1" });

    expect(getTenantPrisma).toHaveBeenCalledWith("tenant-1");
    expect(result).toBe(scopedClient);
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
