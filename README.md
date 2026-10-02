# QMS Document Monitoring

Mobile-first QMS document monitoring PWA built with Next.js App Router, TypeScript, Tailwind CSS, and Supabase-compatible PostgreSQL.

## Run locally

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000. The UI runs in demo mode when Supabase variables are absent. Demo records and edits live in memory and reset when the page is refreshed; do not use demo mode for real records.

## Supabase setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Apply `supabase/migrations/202610020001_qms_core.sql` using the Supabase SQL editor or Supabase CLI.
4. Create users in Supabase Auth, then add matching `profiles` rows with a role (`admin`, `submitter`, `reviewer`, or `viewer`). Reviewer accounts also need a `reviewers` row.
5. Configure a private Storage bucket named `qms-attachments` and Storage policies before enabling attachment uploads.

Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser code. It is included in `.env.example` only for future trusted server operations.

## Included

- Bahasa Indonesia responsive dashboard, submission entry, document list/detail, workflow actions, follow-ups, history, analytics, and master data.
- Demo records covering the supported workflow states.
- Centralized calendar-day SLA/date/status/action helpers.
- XLSX export of the currently filtered document list.
- PWA manifest, icons, service worker, and iOS safe-area navigation.
- Supabase schema, seed master data, role model, RLS policies, immutable history trigger, status-transition guard, and submission number generator.

## Current limitations

- Screens currently use the in-memory demo adapter. Supabase Auth client helpers and production schema are ready, but page data reads/writes are not yet wired to Supabase; production persistence, server-side authorization, and login UI must be connected before real use.
- The seeded UI dataset is generated in code for exploration; it is not persistent and must not be interpreted as workbook data.
- Attachment table exists; private bucket setup and upload UI remain to be done.
- Demo role is Admin. Production roles must be enforced by the database and trusted server actions, not by the demo UI.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm build
```
