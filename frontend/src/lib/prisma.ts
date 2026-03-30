/**
 * lib/prisma.ts — STUB (deshabilitado en arquitectura SPA)
 *
 * El frontend NO accede directamente a la base de datos.
 * Toda la comunicación con datos se hace a través de:
 *   - backend-saas:8000  → Auth, Tenants, Onboarding
 *   - backend-agents:8001 → Agente IA, Traces, Métricas
 *
 * Este archivo existe para evitar errores de importación en código legacy
 * que todavía referencie @/lib/prisma. Reemplaza esas referencias
 * con los hooks de API correspondientes (useApi, apiSaas, apiAgents).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const prisma: any = new Proxy(
  {},
  {
    get(_, prop: string) {
      if (prop === "$connect" || prop === "$disconnect") return async () => {};
      console.error(
        `[prisma.ts STUB] Intento de acceso a prisma.${prop}. ` +
          "El frontend no debe acceder a la DB directamente. " +
          "Usa los hooks de API (useApi, apiSaas, apiAgents) en su lugar.",
      );
      return new Proxy(
        {},
        {
          get(_, action: string) {
            return async () => {
              throw new Error(
                `[SPA Architecture] prisma.${prop}.${action}() bloqueado. ` +
                  "Usa fetch() hacia backend-saas o backend-agents.",
              );
            };
          },
        },
      );
    },
  },
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getTenantPrisma(_tenantId: string): any {
  throw new Error(
    "[SPA Architecture] getTenantPrisma() bloqueado. " +
      "Usa apiSaas() con X-API-Key header en su lugar.",
  );
}
