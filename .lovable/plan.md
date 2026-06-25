## Goal

For visits scheduled on a future date, defer the host approval email and send it on the **visit date at 6:00 AM IST**. For same-day registrations, the host continues to be notified immediately.

## Current behavior

- `supabase/functions/notify-host/index.ts` already defers host notification when `scheduled_date > today (IST)` — this stays as-is.
- `supabase/functions/send-pending-approval-reminders/index.ts` re-invokes `notify-host` (with `force: true`) for every pending visitor whose `scheduled_date` equals today (IST) — this stays as-is.
- The cron job that triggers the reminder function is currently scheduled for **08:00 IST (02:30 UTC)** — this needs to change.

## Changes

1. **Cron schedule → 06:00 IST (00:30 UTC)**
   - Update the `pg_cron` job that calls `send-pending-approval-reminders` to run at `30 0 * * *` (00:30 UTC = 06:00 IST) instead of `30 2 * * *`.
   - Apply via `supabase--insert` so the schedule change runs against the hosted backend.

2. **On-prem install script**
   - Update `deploy/install-reminder-cron.sh` so the same 06:00 IST schedule is provisioned on the customer's Linux server (`vms.resustainability.com`). They will need to re-run it.
   - Update `deploy/diagnose-reminder-cron.sh` expected-schedule string to match.

3. **No edge function code changes**
   - `notify-host` deferral logic stays.
   - `send-pending-approval-reminders` logic stays (still keys off `scheduled_date = today IST`).

## Result

| Registration scenario | Host email timing |
|---|---|
| Visit date = today | Sent immediately at registration |
| Visit date = tomorrow or later | Sent at **06:00 AM IST on the visit date** |

## On-prem follow-up for the user

After this deploys, the user should run on their Linux server:

```bash
cd deploy
./install-reminder-cron.sh
./diagnose-reminder-cron.sh   # verify schedule shows 30 0 * * *
```

This guarantees the 6 AM reminder fires reliably for every location.