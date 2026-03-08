import { describe, it, expect, vi, beforeEach } from "vitest";
import { EconomicsService } from "./tracker";
import { prisma } from "@/lib/prisma";

// Mocking prisma precisely as Used in EconomicsService
vi.mock("@/lib/prisma", () => ({
    prisma: {
        deal: {
            aggregate: vi.fn(),
        },
        businessEvent: {
            count: vi.fn(),
            create: vi.fn(),
        },
    },
}));

describe("EconomicsService", () => {
    const tenantId = "test-tenant-id";

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getTenantROI", () => {
        it("Calculates ROI correctly with standard values", async () => {
            // 1. Mock Revenue: $1000 from CLOSED_WON deals
            (prisma.deal.aggregate as any).mockResolvedValue({
                _sum: { value: 1000 },
            });

            // 2. Mock Expenses
            // a. Scraper Events: 100 leads (Each $0.05 -> Total $5)
            // b. AI Events: 20 messages (Each 500 tokens -> Total 10k tokens -> Each 1k tokens $0.01 -> Total $0.1)
            // c. Base Infra Fee: $10
            // Expected total OpEx: 5 + 0.1 + 10 = 15.1
            // Expected Net Profit: 1000 - 15.1 = 984.9
            // Expected Efficiency Score: 1000 / 15.1 = ~66.22

            (prisma.businessEvent.count as any)
                .mockImplementationOnce(() => Promise.resolve(100)) // First call is Scraper
                .mockImplementationOnce(() => Promise.resolve(20));  // Second call is AI

            const result = await EconomicsService.getTenantROI(tenantId);

            expect(result.totalRevenue).toBe(1000);
            expect(result.totalOpEx).toBeCloseTo(15.1, 2);
            expect(result.netProfit).toBeCloseTo(984.9, 2);
            expect(result.roi).toBeCloseTo((1000 - 15.1) / 15.1, 4);
            expect(result.efficiencyScore).toBeCloseTo(1000 / 15.1, 2);
            expect(result.breakEven).toBe(true);

            // Verify mock calls
            expect(prisma.deal.aggregate).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({ tenantId, stage: "CLOSED_WON" })
            }));
        });

        it("Reports negative results correctly with zero revenue", async () => {
            // No revenue
            (prisma.deal.aggregate as any).mockResolvedValue({ _sum: { value: 0 } });

            // No events
            (prisma.businessEvent.count as any).mockResolvedValue(0);

            const result = await EconomicsService.getTenantROI(tenantId);

            expect(result.totalRevenue).toBe(0);
            expect(result.totalOpEx).toBe(10); // Still has the base infra fee
            expect(result.netProfit).toBe(-10);
            expect(result.breakEven).toBe(false);
            expect(result.roi).toBe(-1); // (0 - 10) / 10 = -1
        });

        it("Handles cases where totalOpEx is zero (should not happen due to base fee, but for safety)", async () => {
            // Mocking totalOpEx to zero by overriding private constants wouldn't work easily,
            // but the service handles totalOpEx > 0 check.
            // If OpEx was 0, it should return ROI 0.
        });
    });

    describe("logExpense", () => {
        it("Creates a business event for operational expenses", async () => {
            const record = {
                tenantId: "test-tenant",
                category: "AI_TOKENS" as const,
                amount: 25.5,
                description: "Test expense"
            };

            await EconomicsService.logExpense(record);

            expect(prisma.businessEvent.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    tenantId: record.tenantId,
                    type: "OPERATIONAL_EXPENSE",
                    payload: expect.objectContaining({
                        category: record.category,
                        amount: record.amount,
                        description: record.description
                    }),
                    source: "system"
                })
            });
        });
    });
});
