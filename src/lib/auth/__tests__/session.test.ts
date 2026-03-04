import { createSession, validateSession, hashToken } from "../session";
import { prisma } from "@/lib/prisma";

// Mock the prisma client
jest.mock("@/lib/prisma", () => ({
    prisma: {
        session: {
            create: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        $transaction: jest.fn((callback) => callback(prisma)),
    },
}));

describe("Session Utils", () => {
    const mockUserId = "user-123";
    const mockTenantId = "tenant-456";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should create a session correctly", async () => {
        const mockSession = {
            id: "session-789",
            userId: mockUserId,
            tenantId: mockTenantId,
            expires: new Date(Date.now() + 12 * 60 * 60 * 1000)
        };
        (prisma.session.create as jest.Mock).mockResolvedValue(mockSession);

        const result = await createSession(mockUserId, mockTenantId);

        expect(result.token).toBeDefined();
        expect(result.session).toEqual(mockSession);
        expect(prisma.session.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                userId: mockUserId,
                tenantId: mockTenantId,
            })
        }));
    });

    it("should validate a valid session", async () => {
        const rawToken = "valid-token";
        const hashedToken = hashToken(rawToken);
        const mockSession = {
            id: "session-789",
            sessionToken: hashedToken,
            userId: mockUserId,
            tenantId: mockTenantId,
            expires: new Date(Date.now() + 10 * 60 * 60 * 1000), // Far from rotation
            revokedAt: null
        };
        (prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession);

        const result = await validateSession(rawToken);

        expect(result).not.toBeNull();
        expect(result?.session).toEqual(mockSession);
        expect(result?.rotated).toBe(false);
    });

    it("should return null for expired session", async () => {
        const rawToken = "expired-token";
        const mockSession = {
            expires: new Date(Date.now() - 1000), // Expired
            revokedAt: null
        };
        (prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession);

        const result = await validateSession(rawToken);
        expect(result).toBeNull();
    });

    it("should return null for revoked session", async () => {
        const rawToken = "revoked-token";
        const mockSession = {
            expires: new Date(Date.now() + 10000),
            revokedAt: new Date() // Revoked
        };
        (prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession);

        const result = await validateSession(rawToken);
        expect(result).toBeNull();
    });
});
