import { POST } from "@/app/[locale]/api/auth/register-company/route";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { vi, describe, it, expect, beforeEach, Mock } from "vitest";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    tenant: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    company: { create: vi.fn() },
    membership: { create: vi.fn() },
    invitation: { create: vi.fn() },
    plan: { findUnique: vi.fn() },
    pipeline: { create: vi.fn() },
    subscription: { create: vi.fn() },
    businessEvent: { create: vi.fn() },
  },
}));

vi.mock("@/lib/auth/session", () => ({
  createSession: vi.fn(),
}));

vi.mock("@/lib/auth/password", () => ({
  hashPassword: vi.fn(),
}));

vi.mock("@/lib/security/audit", () => ({
  logAuditEvent: vi.fn(),
}));

describe("Company Registration Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should register a company and user successfully in a transaction", async () => {
    // Setup mocks
    const mockTenant = {
      id: "tenant-123",
      name: "Acme Corp",
      slug: "acme-corp",
    };
    const mockUser = { id: "user-456", email: "admin@acme.com" };
    const mockPlan = { id: "plan-1", code: "STARTER", pricePerYear: 100 };

    (prisma.user.findUnique as Mock).mockResolvedValue(null);
    (prisma.plan.findUnique as Mock).mockResolvedValue(mockPlan);
    (prisma.tenant.findUnique as Mock).mockResolvedValue(null);
    (prisma.businessEvent.create as Mock).mockResolvedValue({ id: "event-2" });

    (hashPassword as Mock).mockReturnValue("hashed-password");
    (createSession as Mock).mockResolvedValue({
      token: "session-token",
      session: { expires: new Date(Date.now() + 3600000) },
    });

    // Mock transaction implementation
    (prisma.$transaction as Mock).mockImplementation(async (callback) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tx: any = {
        tenant: { create: vi.fn().mockResolvedValue(mockTenant) },
        user: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue(mockUser),
          upsert: vi.fn().mockResolvedValue(mockUser),
        },
        company: { create: vi.fn().mockResolvedValue({ id: "comp-1" }) },
        membership: { create: vi.fn().mockResolvedValue({ id: "mem-1" }) },
        plan: { findUnique: vi.fn().mockResolvedValue(mockPlan) },
        pipeline: { create: vi.fn().mockResolvedValue({ id: "pipe-1" }) },
        subscription: { create: vi.fn().mockResolvedValue({ id: "sub-1" }) },
        businessEvent: { create: vi.fn().mockResolvedValue({ id: "event-1" }) },
      };
      return callback(tx);
    });

    const body = {
      firstName: "Fede",
      lastName: "Monfa",
      email: "admin@acme.com",
      companyName: "Acme Corp",
      password: "password123",
    };

    const request = new Request("http://localhost/api/auth/register-company", {
      method: "POST",
      body: JSON.stringify(body),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await POST(request as any);
    const result = await response.json();

    expect(response.status).toBe(201);
    expect(result.success).toBe(true);
    expect(result.tenantId).toBe(mockTenant.id);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(createSession).toHaveBeenCalledWith(mockUser.id, mockTenant.id);
  });
});
