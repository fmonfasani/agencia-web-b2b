import { vi, describe, it, expect, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { ingestLead } from "@/lib/leads/ingest.service";

vi.mock("@/lib/prisma", () => ({
    prisma: {},
    getTenantPrisma: vi.fn(),
}));

vi.mock("@/lib/leads/ingest.service", () => ({
    ingestLead: vi.fn(),
}));

vi.mock("@/lib/auth/request-auth", () => ({
    requireAuth: vi.fn(),
}));

vi.mock("@/lib/ratelimit", () => ({
    ratelimit: {
        limit: vi.fn().mockResolvedValue({ success: true }),
    },
}));

vi.mock("@/lib/sre/metrics", () => ({
    logBusinessMetric: vi.fn(),
}));

describe("POST /api/leads/ingest", () => {
    const INTERNAL_SECRET = "test-secret";

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.INTERNAL_API_SECRET = INTERNAL_SECRET;
    });

    it("accepts valid internal requests with correct secret", async () => {
        const mockLead = { id: "new-lead-id" };
        (ingestLead as any).mockResolvedValue(mockLead);
        (getTenantPrisma as any).mockReturnValue({
            membership: { findFirst: vi.fn() }
        });

        const request = new NextRequest("http://localhost/api/leads/ingest", {
            method: "POST",
            headers: {
                "x-internal-secret": INTERNAL_SECRET,
                "x-tenant-id": "tenant-123",
            },
            body: JSON.stringify({
                sourceType: "SCRAPER",
                name: "Test Business",
                phone: "123456",
            }),
        });

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(ingestLead).toHaveBeenCalledWith(expect.objectContaining({
            tenantId: "tenant-123",
            name: "Test Business",
        }));
    });

    it("rejects internal requests with wrong secret", async () => {
        const request = new NextRequest("http://localhost/api/leads/ingest", {
            method: "POST",
            headers: {
                "x-internal-secret": "wrong-secret",
            },
            body: JSON.stringify({ name: "Test" }),
        });

        const response = await POST(request);
        expect(response.status).toBe(401); // Assuming 401 based on route logic
    });
});
