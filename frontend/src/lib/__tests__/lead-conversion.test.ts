import { vi, describe, it, expect, beforeEach } from "vitest";

const createDealMock = vi.fn();
const findLeadUniqueMock = vi.fn();
const findDealFirstMock = vi.fn();
const updateLeadMock = vi.fn();
const createEventMock = vi.fn();

// Mock Prisma Extension
vi.mock("@/lib/prisma", () => ({
  getTenantPrisma: vi.fn().mockImplementation((tenantId) => ({
    lead: {
      findUnique: findLeadUniqueMock,
      update: updateLeadMock,
    },
    deal: {
      create: createDealMock,
      findFirst: findDealFirstMock,
    },
    businessEvent: {
      create: createEventMock,
    },
  })),
}));

import { LeadConversionService } from "@/lib/leads/conversion-service";

describe("LeadConversionService", () => {
  const tenantId = "test-tenant-123";
  const leadId = "test-lead-456";
  const userId = "test-user-789";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a new deal when lead is converted and none exists", async () => {
    // Lead to convert
    findLeadUniqueMock.mockResolvedValueOnce({
      id: leadId,
      name: "Juan Perez",
      companyName: "Perez Inc",
      potentialScore: 85,
      sourceType: "MANUAL",
    });

    // Check if deal already exists -> None
    findDealFirstMock.mockResolvedValueOnce(null);

    // Mock Deal creation successful
    createDealMock.mockResolvedValueOnce({ id: "deal-001" });

    const deal = await LeadConversionService.convertToDeal(
      tenantId,
      leadId,
      userId,
    );

    expect(deal.id).toBe("deal-001");
    expect(createDealMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId,
        leadId,
        stage: "PROSPECTING",
        value: 850, // 85 * 10
      }),
    });

    expect(updateLeadMock).toHaveBeenCalledWith({
      where: { id: leadId },
      data: { status: "CONVERTED" },
    });

    expect(createEventMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "LEAD_CONVERTED_TO_DEAL",
      }),
    });
  });

  it("should return existing deal if already converted", async () => {
    findLeadUniqueMock.mockResolvedValueOnce({ id: leadId });
    findDealFirstMock.mockResolvedValueOnce({ id: "existing-deal-001" });

    const deal = await LeadConversionService.convertToDeal(
      tenantId,
      leadId,
      userId,
    );

    expect(deal.id).toBe("existing-deal-001");
    expect(createDealMock).not.toHaveBeenCalled();
    expect(updateLeadMock).not.toHaveBeenCalled();
  });

  it("should throw error if lead not found", async () => {
    findLeadUniqueMock.mockResolvedValueOnce(null);

    await expect(
      LeadConversionService.convertToDeal("t1", "missing-lead"),
    ).rejects.toThrow("Lead not found");
  });
});
