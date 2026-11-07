# QMS security hotfix: private Google Sheets endpoints

Date: 2026-11-07

## Exposure addressed

The prior production release allowed anonymous access to `/api/sheets/feed` and `/api/sheets/sync`. The feed queried production documents using a backend service credential and returned metadata, PIC names, reviewer identities, and free-text review notes across the system. Anonymous HTTP smoke checks returned 200 for both endpoints before this fix.

## Mitigations

- Remove the `/api/sheets/` login bypass.
- Require an authenticated, active administrator in each route, in addition to the session proxy.
- Query the feed with the logged-in user's RLS-scoped Supabase client, never a service-role client.
- Do not fall back to demo data on failed database access.
- Prevent CSV formula injection on exported values.
- Stop claiming Google Sheets synchronization succeeded when only the database has been checked.
- Remove public `IMPORTDATA` instructions and misleading sync claims from the UI.

## Validation

- TypeScript `tsc --noEmit`: pass.
- Existing Vitest suite: 28/28 passed.
- ESLint: no errors, one pre-existing `no-page-custom-font` warning in `src/app/layout.tsx`.
- Next.js production build: pass, 16 routes.
- Unauthenticated local HTTP smoke: `/` -> 307, `/login` -> 200, `/api/sheets/feed` -> 307 to login, `/api/sheets/sync` -> 307 to login.

## Limitations / follow-up

- Google Sheets automatic synchronization is NOT implemented or verified; manual admin CSV export remains available subject to RLS.
- Validate an authenticated admin CSV export and non-admin 403 with test accounts in UAT.
- Establish explicit company/tenant IDs in the database plus tenant-aware server RLS; current company inference via `remarks` is not a security boundary.
- Review historical access logs for anonymous feed requests, potential data exposure, and incident-response obligations.
- Add authenticated end-to-end workflow and tenant-isolation tests, not just unit/smoke tests.

This security hotfix does not by itself certify QMS as production-ready for all workflow requirements.
