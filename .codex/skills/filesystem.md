# Skill: filesystem

## Purpose

Allows the agent to read, navigate, and map the Agencia B2B codebase efficiently.

## Capabilities

- Read any file in the project
- Map directory architecture (App Router, Components, Lib, Prisma)
- Locate multi-tenant business logic (Leads, Deals, Agents)
- Detect patterns in Revenue OS implementation

## Key Project Paths

```
Root:         c:\Users\fmonf\Desktop\Software Enginnering LAPTOP\Agencia B2B\agencia-web-b2b\
App Router:   src/app/
Components:   src/components/
Lib (Core):   src/lib/ (auth, prisma, leads, intelligence)
Prisma:       prisma/schema.prisma
Middleware:   src/middleware.ts
Config:       next.config.ts, tsconfig.json, package.json
```

## Route & Entity Map

| Route/Entity | Primary File / Directory |
| ------------ | ------------------------ |
| /dashboard   | src/app/(dashboard)/     |
| Auth         | src/lib/auth.ts          |
| DB Client    | src/lib/prisma.ts        |
| Leads        | src/lib/leads/           |
| AI Agents    | src/lib/bot/             |
| API Routes   | src/app/api/             |
| I18n         | messages/ + src/i18n/    |

## Surgical Discovery Patterns

1. **Symbol Location**:
   `grep -nE "function|const|class" src/lib/auth.ts`
2. **Usage Tracking**:
   `grep -r "prisma.lead" src/`
3. **Partial Reading**:
   Use `Get-Content` with `-TotalCount` in PowerShell for large files.
4. **Schema Check**:
   Instead of reading the whole `schema.prisma`, use `grep` for a specific model:
   `grep -A 20 "model Lead" prisma/schema.prisma`

---

## Usage Instructions

1. Use **Surgical Discovery** tools (grep) before reading full files.
2. Always check `PROJECT_MEMORY.md` for architectural context.
3. If unsure about a tenant's isolation, search for `tenantId` usage in `src/lib`.
