import { requireTenantMembership } from "../authz";
import { auth } from "../auth";
import { requireAuth as requireCustomAuth } from "../auth/request-auth";
import { vi, describe, it, expect, beforeEach, Mock } from "vitest";

// Mock dependencies
vi.mock("../auth", () => ({
  auth: vi.fn(),
}));

vi.mock("../auth/request-auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("../tenant-context", () => ({
  getActiveTenantId: vi.fn(() => Promise.resolve("tenant-123")),
}));

describe("Authorization Logic (authz.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should authorize via NextAuth session", async () => {
    const mockUser = {
      id: "user-1",
      email: "test@example.com",
      tenantId: "tenant-123",
      role: "ADMIN",
    };
    (auth as Mock).mockResolvedValue({ user: mockUser });

    const result = await requireTenantMembership();

    expect(result.user).toEqual(mockUser);
    expect(result.tenantId).toBe("tenant-123");
  });

  it("should authorize via Custom Session (fallback)", async () => {
    (auth as Mock).mockResolvedValue(null); // NextAuth fails
    const mockUser = {
      id: "user-2",
      email: "custom@example.com",
      role: "MEMBER",
    };
    const mockSession = { tenantId: "tenant-123" };
    (requireCustomAuth as Mock).mockResolvedValue({
      user: mockUser,
      session: mockSession,
    });

    const result = await requireTenantMembership();

    expect(result.user.id).toBe("user-2");
    expect(result.tenantId).toBe("tenant-123");
    expect(result.user.role).toBe("MEMBER");
  });

  it("should throw AuthorizationError if no session at all", async () => {
    (auth as Mock).mockResolvedValue(null);
    (requireCustomAuth as Mock).mockResolvedValue(null);

    await expect(requireTenantMembership()).rejects.toThrow(
      "Authentication required",
    );
  });

  it("should throw Forbidden if user belongs to different tenant", async () => {
    const mockUser = {
      id: "user-1",
      email: "test@example.com",
      tenantId: "WRONG-TENANT",
      role: "MEMBER",
    };
    (auth as Mock).mockResolvedValue({ user: mockUser });

    // Assuming getActiveTenantId returns "tenant-123" (mocked above)
    await expect(requireTenantMembership()).rejects.toThrow(
      "Access denied to this tenant",
    );
  });

  it("should authorize SUPER_ADMIN even in different tenant", async () => {
    const mockUser = {
      id: "admin-1",
      email: "admin@example.com",
      tenantId: "SYSTEM",
      role: "SUPER_ADMIN",
    };
    (auth as Mock).mockResolvedValue({ user: mockUser });

    const result = await requireTenantMembership();
    expect(result.user).toEqual(mockUser);
  });

  it("should throw Forbidden if role is not allowed", async () => {
    const mockUser = {
      id: "user-1",
      email: "test@example.com",
      tenantId: "tenant-123",
      role: "VIEWER",
    };
    (auth as Mock).mockResolvedValue({ user: mockUser });

    await expect(requireTenantMembership(["ADMIN"])).rejects.toThrow(
      "Insufficient permissions",
    );
  });
});
