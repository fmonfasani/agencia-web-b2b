import * as Sentry from "@sentry/nextjs";

/**
 * Sets the Sentry context for the current session/request.
 * Connects errors to a specific Tenant and User for Senior-level observability.
 */
export function setSentryContext(tenantId: string, userId?: string) {
    if (tenantId) {
        Sentry.setTag("tenantId", tenantId);
    }

    if (userId) {
        Sentry.setUser({ id: userId });
    }
}

/**
 * Wraps a function with Sentry error capturing.
 */
export async function withSentryBranch<T>(
    name: string,
    fn: () => Promise<T>
): Promise<T> {
    return await Sentry.startSpan({ name }, async () => {
        try {
            return await fn();
        } catch (error) {
            Sentry.captureException(error);
            throw error;
        }
    });
}
