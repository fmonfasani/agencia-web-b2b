/** @jest-environment node */
import { POST } from "@/app/[locale]/api/auth/register-company/route";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { logAuditEvent } from "@/lib/security/audit";

// Mock dependencies
jest.mock("@/lib/prisma", () => ({
    prisma: {
        user: {
            findUnique: jest.fn(),
            upsert: jest.fn(),
        },
        tenant: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
        plan: {
            findUnique: jest.fn(),
        },
        membership: {
            create: jest.fn(),
        },
        pipeline: {
            create: jest.fn(),
        },
        subscription: {
            create: jest.fn(),
        },
        businessEvent: {
            create: jest.fn(),
        },
        $transaction: jest.fn((callback) => callback(prisma)),
    },
}));

jest.mock("@/lib/auth/session", () => ({
    createSession: jest.fn(),
}));

jest.mock("@/lib/auth/password", () => ({
    hashPassword: jest.fn(),
}));

jest.mock("@/lib/security/audit", () => ({
    logAuditEvent: jest.fn(),
}));

describe("API: register-company Integration", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should register a company successfully", async () => {
        const mockData = {
            firstName: "Fede",
            lastName: "Monfasani",
            email: "fede@example.com",
            companyName: "Agencia Leads",
            password: "password123",
            plan: "STARTER"
        };

        const request = new Request("http://localhost/api/auth/register-company", {
            method: "POST",
            body: JSON.stringify(mockData)
        });

        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.plan.findUnique as jest.Mock).mockResolvedValue({ id: "plan-1", code: "STARTER" });
        (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.user.upsert as jest.Mock).mockResolvedValue({ id: "user-1", email: mockData.email });
        (prisma.tenant.create as jest.Mock).mockResolvedValue({ id: "tenant-1", slug: "agencia-leads" });
        (hashPassword as jest.Mock).mockReturnValue("hashed-pwd");
        (createSession as jest.Mock).mockResolvedValue({
            token: "session-token",
            session: { expires: new Date(Date.now() + 3600000) }
        });

        const response = await POST(request as any);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(prisma.user.upsert).toHaveBeenCalled();
        expect(prisma.tenant.create).toHaveBeenCalled();
        expect(prisma.membership.create).toHaveBeenCalled();
        expect(createSession).toHaveBeenCalledWith("user-1", "tenant-1");
    });

    it("should return 400 for incomplete data", async () => {
        const request = new Request("http://localhost/api/auth/register-company", {
            method: "POST",
            body: JSON.stringify({ email: "incomplete@test.com" })
        });

        const response = await POST(request as any);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error).toBe("Datos incompletos");
    });

    it("should return 400 if user with password already exists", async () => {
        const mockData = {
            firstName: "Fede",
            lastName: "Monfasani",
            email: "existing@example.com",
            companyName: "Agencia",
            password: "password123"
        };

        const request = new Request("http://localhost/api/auth/register-company", {
            method: "POST",
            body: JSON.stringify(mockData)
        });

        (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "user-1", passwordHash: "already-has-one" });

        const response = await POST(request as any);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error).toBe("Este email ya está registrado");
    });
});
