import { beforeEach, describe, expect, it, vi } from "vitest";
import { getScopedPrisma } from "../scoped-prisma";
import { auth } from "../auth";
import { requireAuth as requireCustomAuth } from "../auth/request-auth";
import { getTenantPrisma } from "../prisma";

vi.mock("../auth", () => ({
  auth: vi.fn(),
}));

vi.mock("../auth/request-auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("../prisma", () => ({
  getTenantPrisma: vi.fn(),
}));

describe("getScopedPrisma", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns tenant prisma from NextAuth session", async () => {
    const scoped = { lead: { findMany: vi.fn() } };
    (auth as any).mockResolvedValue({ user: { tenantId: "tenant-nextauth" } });
    (getTenantPrisma as any).mockReturnValue(scoped);

    const result = await getScopedPrisma();

    expect(getTenantPrisma).toHaveBeenCalledWith("tenant-nextauth");
    expect(result).toBe(scoped);
  });

  it("throws when auth context is missing", async () => {
    (auth as any).mockResolvedValue(null);
    (requireCustomAuth as any).mockResolvedValue(null);

    await expect(getScopedPrisma()).rejects.toThrow("UNAUTHORIZED_SCOPED_PRISMA_CONTEXT");
  });
});
