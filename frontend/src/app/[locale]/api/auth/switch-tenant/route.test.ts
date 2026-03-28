import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { requireAuth } from "@/lib/auth/request-auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/security/audit";

vi.mock("@/lib/auth/request-auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  getClientIp: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/security/audit", () => ({
  logAuditEvent: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    membership: { findFirst: vi.fn() },
    session: { update: vi.fn() },
  },
}));

describe("POST /[locale]/api/auth/switch-tenant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when user has no active membership in target tenant", async () => {
    (requireAuth as any).mockResolvedValue({
      user: { id: "user-1" },
      session: { id: "session-1", tenantId: "tenant-a" },
    });
    (prisma.membership.findFirst as any).mockResolvedValue(null);

    const request = new Request("http://localhost/es/api/auth/switch-tenant", {
      method: "POST",
      body: JSON.stringify({ tenantId: "tenant-b" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Forbidden");
    expect(prisma.session.update).not.toHaveBeenCalled();
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "TENANT_SWITCH_DENIED", tenantId: "tenant-b" }),
    );
  });

  it("switches tenant when active membership exists", async () => {
    (requireAuth as any).mockResolvedValue({
      user: { id: "user-1" },
      session: { id: "session-1", tenantId: "tenant-a" },
    });
    (prisma.membership.findFirst as any).mockResolvedValue({ id: "m-1" });
    (prisma.session.update as any).mockResolvedValue({ id: "session-1" });

    const request = new Request("http://localhost/es/api/auth/switch-tenant", {
      method: "POST",
      body: JSON.stringify({ tenantId: "tenant-b" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(prisma.session.update).toHaveBeenCalledWith({
      where: { id: "session-1" },
      data: { tenantId: "tenant-b" },
    });
  });
});
