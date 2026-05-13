## Goal

Defer the host approval email so it is sent on the morning of the visit date (08:00 IST), not at registration.

## Changes

### 1. `notify-host` edge function
- Read `visitor.scheduled_date`. If it is in the future (later than today in Asia/Kolkata), **skip** the host approval email and host WhatsApp/SMS.
- Still send the visitor's "Visit Request Submitted" confirmation email immediately so they know their request was received.
- Same-day registrations continue to behave exactly as today (immediate host email).

### 2. New edge function `send-pending-approval-reminders`
- Runs daily. Queries visitors where `status = 'pending_approval'` AND `scheduled_date = today (Asia/Kolkata)`.
- For each one, calls the existing `notify-host` logic (host email + WhatsApp/SMS with approve/reject links). To avoid duplicating ~700 lines, it will reuse `notify-host` by invoking it per visitor with a flag `force=true` that bypasses the future-date guard.
- Logs results; safe to re-run (idempotent — host can already be approved).

### 3. Schedule via `pg_cron` + `pg_net`
- Enable `pg_cron` and `pg_net` extensions.
- Schedule `send-pending-approval-reminders` daily at **02:30 UTC = 08:00 IST**.

### 4. `notify-host` accepts `force` flag
- New optional body field `force?: boolean`. When true, the future-date guard is skipped (used by the cron reminder).

## Technical notes

- Date comparison uses `Asia/Kolkata` so the cutoff matches Indian operating hours.
- Visitor confirmation email path is unchanged — only the host-side notifications are deferred.
- No DB schema changes required; `scheduled_date` already exists on `visitors`.
- The cron `pg_cron` SQL contains the project URL and anon key, so it will be executed via `supabase--insert` (not a migration), per platform guidance.
