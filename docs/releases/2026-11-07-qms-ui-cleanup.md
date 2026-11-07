# QMS Monitor — 7 Nov 2026 UI clean-up

## Changes

- Removed obsolete Google Spreadsheet menu items, modal, buttons and `/api/sheets/*` endpoints. Supabase PostgreSQL remains the single application datastore. Existing Documents CSV/Excel/PDF exports remain.
- Corrected empty KPI semantics: 0 eligible documents is **N/A**, not 100% approval or 100% SLA compliance. Removed fabricated 1.8-day average and zero-height fake chart bars.
- Improved empty states for Dashboard, Tracking, and Documents, including contextual create-document actions only for authorized roles.
- Improved document filters and user-management form layout for desktop/tablet/mobile.
- Added unit tests for zero-denominator metrics.

## Read-only database validation

- Total `document_submissions`: 5.
- Unarchived submissions: 0.
- Archived submissions: 5.
- `document_history`: 33 records.
- `profiles`: 3 records.
- No database writes, restores, deletions or migrations were performed.

## Known follow-up

- Full workflow UAT still needs active QMS, QMS Section Head and QMSR test accounts.
- History page does not show audit events belonging to archived submissions because it reads only active documents. Design a secure archived-history view separately, with explicit tenant-level access checks.
- Proper company isolation requires database tenant identifiers and RLS; company labels in remarks or client-side filters alone are insufficient.
- Review the archive audit log with Rosa before deciding whether archived documents should be restored or remain archived.
