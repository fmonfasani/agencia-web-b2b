# 🧠 Agencia B2B Project: Codex Instructions

## 🏗️ Architecture & Stack

- **Framework**: Next.js 16 (App Router) with React 19.
- **Database / ORM**: Prisma (PostgreSQL).
- **Authentication**: Auth.js v5 (NextAuth) with Prisma adapter.
- **Styling**: Tailwind CSS 4, Framer Motion for premium animations.
- **Multi-tenancy**: Based on `Tenant` model. All business data (Leads, Deals, agents, etc.) MUST be scoped by `tenantId`.
- **RBAC**: Handled through `Membership.role`. Roles: `SUPER_ADMIN, ADMIN, OPERATOR, MEMBER, VIEWER`.

## 🚀 Key Patterns for LLMs

1. **Server Components & Actions**: Prefer Server Components for data fetching and Server Actions for mutations.
2. **Tenant Isolation**: Always verify the `tenantId` of the current session before querying or mutating data. Use middleware or utility guards to ensure a user belongs to the tenant.
3. **Internalization**: Project uses `next-intl`. Use translation keys from `messages/`.
4. **Prisma Client**: Use the singleton client (likely in `src/lib/prisma.ts` or similar).
5. **AI Integration**: The project includes an `Intelligence Engine`. All AI-related logic should follow the patterns in `intelligence_engine/`.

## 🛡️ Security & Validation

- **Middleware**: Used for route protection and session management.
- **Validation**: Use `zod` for validating action inputs and API requests.
- **RLS (Database level)**: While Prisma is the main ORM, ensure the PostgreSQL DB has appropriate policies if direct access is used.

## 🧪 Testing & Quality

- **Unit/Integration**: Jest. Run `npm run test` after core logic changes.
- **E2E**: Playwright. Run `npm run test:e2e` for critical flows.
- **Linting**: Strict ESLint rules. Always fix errors to keep AI context clean.

---

_Follow these instructions to maintain architectural consistency and high code quality in the Agencia B2B ecosystem._
