# Project Context & Infrastructure

This file serves as the **Ground Truth** for any AI agent working on this project. It defines the architecture, hosting, and database status to ensure consistency across sessions.

## 🏗️ Architecture Overview
- **Frontend**: Next.js (App Router) hosted on **Vercel**.
- **Agent Service**: Python (FastAPI) hosted on **VPS**.
- **Database**: PostgreSQL hosted on **VPS (DigitalOcean)**.
- **Authentication**: Custom implementation using a `/api/auth/login` route which validates against the PostgreSQL database on the VPS. It also uses Auth.js (NextAuth v5) for Google/Microsoft Entra and internal hardcoded credentials.

## 🌐 Infrastructure Details
- **VPS IP**: `134.209.41.51`
- **Database Connection**: Uses `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING` in `.env`, pointing to the VPS.
- **Deployment Flow**: GitHub push triggers **GitHub Actions** (CI) -> Triggers **Vercel** (Frontend deploy).
- **Environment Variables**: Managed in Vercel Dashboard for production and `.env` for local/VPS development.

## 🔐 Auth Troubleshooting (Ground Truth)
- **Primary Admin**: `fmonfasani@gmail.com` (Stored in VPS DB).
- **Session System**: Custom session logic in `src/lib/auth/session.ts` using the `Session` table.
- **Password Hashing**: `scryptSync` with `salt:hash` format (see `src/lib/auth/password.ts`).

## ⚠️ Known Issues
- **Cloud CI (GitHub Actions)**: Fails to run migrations because it lacks DB secrets. The build script in `package.json` is modified to be resilient (`|| echo 'Skipping'`).
- **Audit Logs**: The `AuditEventType` enum was recently fixed to include missing types like `LEAD_CREATED`.

---
*Last Updated: 2026-03-07 by Antigravity AI Agent*
