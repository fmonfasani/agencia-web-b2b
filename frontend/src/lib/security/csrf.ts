import { logger } from "@/lib/logger";

/**
 * CSRF Protection via Origin Header Validation
 *
 * Validates that incoming requests originate from allowed domains.
 * This prevents Cross-Site Request Forgery (CSRF) attacks by ensuring
 * that API requests come from our own domain, not malicious third-party sites.
 *
 * Same-site cookies (sameSite: "lax") provide partial protection, but
 * Origin validation is more explicit and comprehensive.
 */

/**
 * Validate that request origin matches allowed domains
 * @param request - The incoming HTTP request
 * @returns true if origin is allowed, false otherwise
 */
export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  // Same-origin requests from the browser always have Origin header
  // (or no Origin header for simple requests, but those are usually GET)
  if (!origin) {
    logger.debug("[CSRF] Request without Origin header", { host });
    return false;
  }

  // Build list of allowed origins
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL, // Production URL
    `https://${host}`, // Current host (HTTPS in prod)
    `http://${host}`, // Current host (HTTP in dev)
  ].filter(Boolean) as string[];

  const isAllowed = allowedOrigins.includes(origin);

  if (!isAllowed) {
    logger.warn("[CSRF] Origin validation failed", {
      origin,
      host,
      allowedOrigins,
    });
  }

  return isAllowed;
}

/**
 * Middleware to enforce CSRF protection on mutating requests
 * Use in API routes that modify data: POST, PUT, DELETE, PATCH
 *
 * Example usage:
 * ```typescript
 * export async function POST(req: NextRequest) {
 *   if (!validateOrigin(req)) {
 *     return NextResponse.json(
 *       { error: "Origin not allowed" },
 *       { status: 403 }
 *     );
 *   }
 *   // ... rest of handler
 * }
 * ```
 */
export function requireValidOrigin(request: Request): void {
  if (!validateOrigin(request)) {
    const origin = request.headers.get("origin");
    const error = new Error(`CSRF: Invalid origin: ${origin}`);
    (error as any).status = 403;
    throw error;
  }
}
