# Skill: test

## Purpose

Auto-detect and execute tests for the Webshooks project.

## Current Test Status

The project already includes **Jest** for unit/integration and **Playwright** for E2E.

## Auto-Detection Login

Run this to check if any test runner is present:

```powershell
cd "c:\Users\fmonf\Desktop\Software Enginnering LAPTOP\Webshooks\agencia-web-b2b"
cat package.json | Select-String "jest|playwright|test"
```

## Running Unit/Integration Tests (Jest)

```powershell
cd "c:\Users\fmonf\Desktop\Software Enginnering LAPTOP\Webshooks\agencia-web-b2b"
npm test
npm run test:watch
npm run test:coverage
```

## Running E2E Tests (Playwright)

```powershell
cd "c:\Users\fmonf\Desktop\Software Enginnering LAPTOP\Webshooks\agencia-web-b2b"
npx playwright test
# For UI mode
npx playwright test --ui
```

## Priority Test Targets

Write and run tests for:

1. `src/lib/auth.ts`: Middleware and session logic.
2. `src/lib/leads/`: Lead repository and business rules.
3. `src/lib/bot/`: Intelligence Engine logic and prompt generation.
4. `src/middleware.ts`: Tenant isolation and protected routes.
5. `src/app/api/`: All API route handlers.

## CI/CD Check (Lighthouse)

```powershell
npx lhci autorun
```

## Usage Instructions

When asked to run tests, use `npm test` for logic or `npx playwright test` for UI.
Always check `jest.setup.js` and `jest.config.js` if tests are failing.
If a test is missing, suggest creating it in `src/lib/__tests__`.
