const findManyMock = jest.fn();
const createMock = jest.fn();

const redisSetMock = jest.fn();
const redisSaddMock = jest.fn();
const redisGetMock = jest.fn();
const redisSmembersMock = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    lead: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      create: (...args: unknown[]) => createMock(...args),
    },
  },
}));

jest.mock("@upstash/redis", () => ({
  Redis: jest.fn().mockImplementation(() => ({
    set: (...args: unknown[]) => redisSetMock(...args),
    sadd: (...args: unknown[]) => redisSaddMock(...args),
    get: (...args: unknown[]) => redisGetMock(...args),
    smembers: (...args: unknown[]) => redisSmembersMock(...args),
  })),
}));

import {
  buildLeadTenantWhere,
  createLeadForTenant,
  listLeadsByTenant,
} from "@/lib/lead-repository";
import { TenantContextError } from "@/lib/tenant-context";
import { getAllLeads, getLead, saveLead } from "@/lib/bot/lead-manager";

describe("Lead multi-tenant protections", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fails fast when tenantId is missing", async () => {
    expect(() => buildLeadTenantWhere(undefined)).toThrow(TenantContextError);
    await expect(listLeadsByTenant(undefined)).rejects.toThrow(
      TenantContextError,
    );
    await expect(
      createLeadForTenant({
        email: "test@example.com",
        message: "hola",
        source: "contact_form",
      }),
    ).rejects.toThrow(TenantContextError);
  });

  it("always scopes prisma reads by tenantId", async () => {
    findManyMock.mockResolvedValueOnce([]);

    await listLeadsByTenant("tenant-a");

    expect(findManyMock).toHaveBeenCalledWith({
      where: { tenantId: "tenant-a" },
      orderBy: { createdAt: "desc" },
      take: 50,
      skip: 0,
    });
  });

  it("always assigns tenantId in prisma lead creation", async () => {
    createMock.mockResolvedValueOnce({ id: "lead-1" });

    await createLeadForTenant({
      tenantId: "tenant-a",
      email: "lead@example.com",
      message: "Necesito ayuda",
      source: "contact_form",
    });

    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ tenantId: "tenant-a" }),
    });
  });

  it("stores and reads bot leads in tenant-specific Redis namespaces", async () => {
    redisSmembersMock.mockResolvedValueOnce(["lead:tenant-a:54911"]);
    redisGetMock.mockResolvedValueOnce({ phone: "54911" });

    await saveLead(
      {
        phone: "54911",
        status: "qualified",
        timestamp: new Date().toISOString(),
      },
      "tenant-a",
    );

    await getLead("54911", "tenant-a");
    await getAllLeads("tenant-a");

    expect(redisSetMock).toHaveBeenCalledWith(
      "lead:tenant-a:54911",
      expect.objectContaining({ tenantId: "tenant-a" }),
    );
    expect(redisSaddMock).toHaveBeenCalledWith(
      "all_leads:tenant-a",
      "lead:tenant-a:54911",
    );
    expect(redisGetMock).toHaveBeenCalledWith("lead:tenant-a:54911");
    expect(redisSmembersMock).toHaveBeenCalledWith("all_leads:tenant-a");
  });
});
