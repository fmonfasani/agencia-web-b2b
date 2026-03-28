import { headers } from "next/headers";

const TENANT_HEADER_NAME = "x-tenant-id";

export class TenantContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantContextError";
  }
}

export function requireTenantId(tenantId?: string | null): string {
  if (!tenantId || tenantId.trim().length === 0) {
    throw new TenantContextError("Missing tenantId in request context");
  }

  return tenantId.trim();
}

export function resolveTenantIdFromHeaders(
  requestHeaders: Headers,
  fallbackTenantId?: string,
): string {
  const tenantFromHeader = requestHeaders.get(TENANT_HEADER_NAME);
  return requireTenantId(tenantFromHeader ?? fallbackTenantId);
}

export async function getActiveTenantId(
  fallbackTenantId?: string,
): Promise<string> {
  const requestHeaders = await headers();
  return resolveTenantIdFromHeaders(requestHeaders, fallbackTenantId);
}
