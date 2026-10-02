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
2. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or the legacy anon key).
3. Apply `supabase/migrations/202610020001_qms_core.sql` using the Supabase SQL editor or Supabase CLI.
4. Create the first Admin user in Supabase Auth, then add the matching `profiles` row with `role = 'admin'`. Create later users in Supabase Auth and add profile rows with roles (`admin`, `submitter`, `reviewer`, or `viewer`). Reviewer accounts also need a `reviewers` row.
5. Configure a private Storage bucket named `qms-attachments` and Storage policies before enabling attachment uploads.

The application uses cookie-based Supabase Auth, a protected Next.js 16 Proxy, and RLS. Public signup is not exposed.

## Included

- Bahasa Indonesia responsive dashboard, submission entry, document list/detail, workflow actions, follow-ups, history, analytics, and master data.
- Email/password Supabase Auth with persistent cookie sessions, login, and sign out.
- Demo records covering the supported workflow states.
- Centralized calendar-day SLA/date/status/action helpers.
- XLSX export of the currently filtered document list.
- PWA manifest, icons, service worker, and iOS safe-area navigation.
- Supabase schema, seed master data, role model, RLS policies, immutable history trigger, status-transition guard, and submission number generator.

## Current limitations

- With Supabase configured, the dashboard, document list/detail, action center, history, analytics, and master data read from PostgreSQL. New submissions, workflow transitions, follow-ups, department/type creation, and SLA changes persist through authenticated Supabase calls guarded by RLS.
- Editing existing submission metadata, adding reviewer profiles through the UI, and attachment upload/download are not implemented yet. Reviewer accounts and profiles must be provisioned in Supabase.
- The seeded UI dataset is generated in code for exploration; it is not persistent and must not be interpreted as workbook data.
- Attachment table exists; private bucket setup and upload UI remain to be done.
- Demo mode is an in-memory Admin preview. It resets on refresh and is not suitable for operational data.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm build
```
