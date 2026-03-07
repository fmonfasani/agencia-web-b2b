import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "production"
        ? ["error"]
        : ["query", "info", "warn", "error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * MODELS WITH MULTI-TENANCY Support
 * These models have a `tenantId` field and must be scoped.
 */
const MULTI_TENANT_MODELS = [
  "Agent", "Product", "Service", "Pipeline", "Deal",
  "Customer", "Lead", "Activity", "Task", "Project",
  "UserDailyMetrics", "Membership", "Invitation",
  "InvitationAudit", "Subscription", "BusinessEvent", "ApiCostEvent",
  "OutreachCampaign", "OutreachMessage"
];

/**
 * Creates a Prisma client instance that automatically filters by tenantId
 * for multi-tenant models. This prevents data leaks between organizations.
 */
export function getTenantPrisma(tenantId: string) {
  if (!tenantId) throw new Error("tenantId is required for scoped Prisma client");

  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (MULTI_TENANT_MODELS.includes(model)) {
            const castArgs = args as any;

            // 1. Read Operations: Inject tenantId in 'where'
            if (["findMany", "findFirst", "count", "aggregate", "groupBy"].includes(operation)) {
              castArgs.where = { ...castArgs.where, tenantId };
            }

            // 2. findUnique -> findFirst (since unique constraints might not include tenantId)
            if (operation === "findUnique" || operation === "findUniqueOrThrow") {
              const op = operation === "findUnique" ? "findFirst" : "findFirstOrThrow";
              return (prisma[model as any] as any)[op]({
                ...castArgs,
                where: { ...castArgs.where, tenantId }
              });
            }

            // 3. Create Operations: Ensure tenantId is set
            if (operation === "create") {
              castArgs.data = { ...castArgs.data, tenantId };
            }
            if (operation === "createMany") {
              if (Array.isArray(castArgs.data)) {
                castArgs.data = castArgs.data.map((item: any) => ({ ...item, tenantId }));
              } else {
                castArgs.data = { ...castArgs.data, tenantId };
              }
            }

            // 4. Update/Delete Operations: Inject tenantId in 'where'
            if (["update", "updateMany", "delete", "deleteMany", "upsert"].includes(operation)) {
              castArgs.where = { ...castArgs.where, tenantId };

              if (operation === "upsert") {
                castArgs.create = { ...castArgs.create, tenantId };
                castArgs.update = { ...castArgs.update, tenantId };
              }
            }
          }

          return query(args);
        },
      },
    },
  });
}
