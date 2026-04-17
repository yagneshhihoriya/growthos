# GrowthOs — agent context (keep this file small)

Next.js 14 App Router + Prisma + NextAuth v5 + S3 + Redis/BullMQ. Photo Studio uses Gemini (`GEMINI_API_KEY`, optional `GEMINI_IMAGE_MODEL`) for `/api/images/generate`.

## Read first, then narrow

1. **This file** + the **one** path below that matches the task.
2. **Grep / codebase search** for symbols; avoid opening whole trees (e.g. not all of `src/components/`).
3. Paste **only** the snippets you need in chat; use `…` in citations for skipped lines.

## Where things live

| Area | Path |
|------|------|
| Auth | `src/lib/auth.ts`, `src/app/api/auth/**`, `src/middleware.ts` |
| Env schema | `src/lib/env.ts` (names only; values in `.env.local`) |
| DB | `prisma/schema.prisma`, `src/lib/db.ts` |
| S3 / private images | `src/lib/s3.ts`, `src/lib/s3-object-access.ts`, `src/app/api/images/file/route.ts` |
| Generate (Gemini) | `src/app/api/images/generate/route.ts`, `src/lib/image-pipeline.ts` |
| Library + delete | `src/app/api/images/library/route.ts`, `src/app/api/images/library/[jobId]/route.ts` |
| Photo Studio UI | `src/components/photo-studio/*`, `src/app/(dashboard)/photo-studio/**` |
| Social posts (IG/FB) | `src/app/(dashboard)/social-posts`, `src/components/social/*`, `src/app/api/social/**`, `src/app/api/cron/**`, `src/lib/meta-post.ts`, `src/workers/social-scheduler.ts` |
| Dashboard shell | `src/components/layout/DashboardShell.tsx`, `Sidebar.tsx` |

## Product notes

- **Edit / Create** modes in Photo Studio; generated URLs often use `/api/images/file?key=…` (auth + presign), not raw public S3 URLs.
- **Permanent delete** removes DB row and resolves S3 keys from stored URLs (see `collectS3KeysForImageJob`).

## Commands

- `npm run dev` — app
- `npm run db:push` — Prisma schema to DB
- `npm run worker:image` — image worker (if used)
- `npm run worker:social` — BullMQ ticks calling `/api/cron/*` (needs `REDIS_URL`, `CRON_SECRET`, app running)

When architecture changes meaningfully, update **this file in ≤15 lines** or ask the user before growing it.
