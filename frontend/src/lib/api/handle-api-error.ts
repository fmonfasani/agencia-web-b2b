import { logger } from "@/lib/logger";

/**
 * Safe error patterns that are OK to expose to clients.
 * Business logic errors that don't leak internal system details.
 */
const SAFE_ERROR_PATTERNS = [
  /^INVITATION_NOT_FOUND$/,
  /^MEMBERSHIP_NOT_FOUND$/,
  /^Token invalid or expired$/,
  /^Missing tenantId/,
  /^Unauthorized/,
  /^Insufficient role/,
  /^Access denied/,
  /^No brief found/,
  /^Invalid signature$/,
  /^Plan limit exceeded/,
] as const;

/**
 * Centralized API error handler that discriminates between safe and unsafe errors.
 * Safe errors (business logic) are exposed to the client.
 * Unsafe errors (infrastructure, DB, etc) are only logged internally.
 */
export function handleApiError(
  error: unknown,
  fallbackMessage: string = "Internal server error",
  context?: Record<string, unknown>,
): { message: string; status: number } {
  if (error instanceof Error) {
    // Always log the actual error for investigation
    logger.error(fallbackMessage, {
      ...context,
      errorMessage: error.message,
      errorName: error.name,
    });

    // Only expose message to client if it's a known business logic error
    const isSafe = SAFE_ERROR_PATTERNS.some((pattern) =>
      pattern.test(error.message),
    );

    if (isSafe) {
      return { message: error.message, status: 400 };
    }
  } else {
    // Non-Error objects are logged but never exposed
    logger.error(fallbackMessage, {
      ...context,
      error: String(error),
    });
  }

  // Generic message for infrastructure/database errors
  return { message: fallbackMessage, status: 500 };
}
