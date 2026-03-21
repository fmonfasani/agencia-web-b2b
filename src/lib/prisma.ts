import { PrismaClient } from "@prisma/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalForPrisma = global as unknown as { prisma: any };

/**
 * Creates a transparent proxy that forwards Prisma queries to a Bridge Server.
 * This allows Vercel and Local environments to work via Cloudflare Tunnels
 * without needing direct access to port 5432.
 */
function createRemotePrismaProxy() {
  return new Proxy(
    {},
    {
      get(target, modelName: string) {
        // Basic support for Prisma system methods
        if (modelName === "$connect" || modelName === "$disconnect")
          return async () => {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (modelName === "$transaction")
          return async (callback: any) => callback(createRemotePrismaProxy());
        if (modelName.startsWith("$"))
          return async () => {
            console.warn(
              `Prisma method ${modelName} not fully supported in Bridge mode.`,
            );
            return null;
          };

        return new Proxy(
          {},
          {
            get(_, action: string) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              return async (args: any) => {
                const bridgeUrl =
                  process.env.BRIDGE_URL || "http://localhost:3002";
                const bridgeKey = process.env.BRIDGE_API_KEY;

                if (!bridgeKey) {
                  console.error(
                    "BRIDGE_API_KEY is missing. Database access will fail.",
                  );
                }

                try {
                  const response = await fetch(`${bridgeUrl}/query`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "x-bridge-key": bridgeKey || "",
                    },
                    body: JSON.stringify({ model: modelName, action, args }),
                  });

                  if (!response.ok) {
                    const error = await response
                      .json()
                      .catch(() => ({ error: "Unknown Bridge Error" }));
                    throw new Error(
                      error.error || `Bridge Error: ${response.statusText}`,
                    );
                  }

                  const result = await response.json();
                  return result.data;
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } catch (err: any) {
                  console.error(
                    `[PrismaBridge] Error in ${modelName}.${action}:`,
                    err.message,
                  );
                  throw err;
                }
              };
            },
          },
        );
      },
    },
  );
}

// Decide which client to use: Local (if on VPS/Direct) or Bridge (if Tunnel is needed)
const useBridge =
  process.env.USE_BRIDGE === "true" ||
  (!process.env.DATABASE_URL && process.env.BRIDGE_URL);

export const prisma =
  globalForPrisma.prisma ||
  (useBridge
    ? createRemotePrismaProxy()
    : new PrismaClient({
        log:
          process.env.NODE_ENV === "production"
            ? ["error"]
            : ["query", "info", "warn", "error"],
      }));

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * MODELS WITH MULTI-TENANCY Support
 * These models have a `tenantId` field and must be scoped.
 */
const MULTI_TENANT_MODELS = [
  "Agent",
  "Product",
  "Service",
  "Pipeline",
  "Deal",
  "Customer",
  "Lead",
  "Activity",
  "Task",
  "Project",
  "UserDailyMetrics",
  "Membership",
  "Invitation",
  "InvitationAudit",
  "Subscription",
  "BusinessEvent",
  "ApiCostEvent",
  "OutreachCampaign",
  "OutreachMessage",
  "Appointment",
  "Proposal",
  "PaymentEvent",
  "BillingAlert",
];

/**
 * Creates a Prisma client instance that automatically filters by tenantId
 * for multi-tenant models. This prevents data leaks between organizations.
 */
export function getTenantPrisma(tenantId: string) {
  if (!tenantId)
    throw new Error("tenantId is required for scoped Prisma client");

  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({
          model,
          operation,
          args,
          query,
        }: {
          model: string;
          operation: string;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          args: any;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          query: any;
        }) {
          if (MULTI_TENANT_MODELS.includes(model)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const castArgs = args as any;

            // 1. Read Operations: Inject tenantId in 'where'
            if (
              [
                "findMany",
                "findFirst",
                "count",
                "aggregate",
                "groupBy",
              ].includes(operation)
            ) {
              castArgs.where = { ...castArgs.where, tenantId };
            }

            // 2. findUnique -> findFirst (since unique constraints might not include tenantId)
            if (
              operation === "findUnique" ||
              operation === "findUniqueOrThrow"
            ) {
              const op =
                operation === "findUnique" ? "findFirst" : "findFirstOrThrow";
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              return (prisma[model as any] as any)[op]({
                ...castArgs,
                where: { ...castArgs.where, tenantId },
              });
            }

            // 3. Create Operations: Ensure tenantId is set
            if (operation === "create") {
              castArgs.data = { ...castArgs.data, tenantId };
            }
            if (operation === "createMany") {
              if (Array.isArray(castArgs.data)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                castArgs.data = castArgs.data.map((item: any) => ({
                  ...item,
                  tenantId,
                }));
              } else {
                castArgs.data = { ...castArgs.data, tenantId };
              }
            }

            // 4. Update/Delete Operations: Inject tenantId in 'where'
            if (
              [
                "update",
                "updateMany",
                "delete",
                "deleteMany",
                "upsert",
              ].includes(operation)
            ) {
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
