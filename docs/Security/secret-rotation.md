# Secret Rotation Checklist

Rotate immediately if any secret was exposed in repository history, logs, or screenshots.

## Secrets to rotate
- `OPENAI_API_KEY`
- `AUTH_GOOGLE_SECRET`
- `AUTH_SECRET`
- `DATABASE_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `ADMIN_SECRET`
- `INTERNAL_API_SECRET`
- `SENTRY_AUTH_TOKEN`

## Rotation procedure
1. Generate new secret values in the provider console.
2. Update values in the runtime secret manager and deployment environment.
3. Revoke old credentials/tokens.
4. Restart app and agent-service to pick up new values.
5. Verify health checks and key integrations.
6. Record rotation timestamp and owner in incident log.
