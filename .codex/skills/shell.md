# Skill: shell

## Purpose

Allows the agent to execute project scripts, run the dev server, and invoke linters and Prisma CLI from PowerShell.

## Environment

```
Shell:    PowerShell (Windows 11)
Node:     (detected from system)
Package:  npm
Root:     c:\Users\fmonf\Desktop\Software Enginnering LAPTOP\Webshooks\agencia-web-b2b\
```

## Available npm Scripts (Webshooks)

| Script  | Command           | Description                          |
| ------- | ----------------- | ------------------------------------ |
| dev     | `npm run dev`     | Start Next.js dev server (port 3001) |
| build   | `npm run build`   | Production build (Prisma + Next.js)  |
| start   | `npm start`       | Start production server              |
| lint    | `npm run lint`    | Run ESLint                           |
| test    | `npm test`        | Run Jest tests                       |
| db:seed | `npm run db:seed` | Seed the database with Prisma        |

## How to Run Dev Server

```powershell
cd "c:\Users\fmonf\Desktop\Software Enginnering LAPTOP\Webshooks\agencia-web-b2b"
npm run dev
```

The app will be available at http://localhost:3001

## Database Operations (Prisma)

```powershell
npx prisma generate
npx prisma studio
npx prisma migrate dev --name <migration-name>
npx prisma db push
```

## Linting

```powershell
cd "c:\Users\fmonf\Desktop\Software Enginnering LAPTOP\Webshooks\agencia-web-b2b"
npm run lint
```

Config: `eslint.config.mjs`

## Environment Variables

Required in `.env`:

- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `AUTH_SECRET` (for NextAuth)
- `AI_API_KEY` (for Intelligence Engine)
- `RESEND_API_KEY` (for mailing)

## Safety Rules

- Never run `prisma db push` in production without a backup.
- Never expose `.env` values in logs or diffs.
- Always check `npm run lint` before committing major changes.
- Always `cd` to project root before running scripts.
