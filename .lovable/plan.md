## Why the host wasn't getting the pre-scheduling email

By design, when a visitor is pre-registered for a **future date**, `notify-host` defers the host email (only the visitor confirmation goes out immediately). On the **morning of the visit**, the cron job `send-pending-approval-reminders-daily` re-invokes `notify-host` with `force:true`, which sends the host the approval email.

The cron is currently scheduled at `30 2 * * *` UTC = **8:00 AM IST**. (Earlier in this chat it was incorrectly described as "2:30 AM" — pg_cron runs in UTC, so 02:30 UTC is actually 08:00 IST.)

You confirmed you want to **keep the defer-until-morning behavior** but **change the send time**. I'll move it earlier to **7:00 AM IST** (a sensible default for "first thing in the morning, before work starts") so hosts see the approval request as soon as they check email.

## Change

Update the existing pg_cron job to fire at **01:30 UTC = 07:00 AM IST**:

```sql
-- 1. unschedule the current job
SELECT cron.unschedule('send-pending-approval-reminders-daily');

-- 2. reschedule at 01:30 UTC (07:00 IST)
SELECT cron.schedule(
  'send-pending-approval-reminders-daily',
  '30 1 * * *',
  $$ ... existing net.http_post call to send-pending-approval-reminders ... $$
);
```

No edge-function code changes. No frontend changes. The deferral logic in `notify-host` (`skipHost = !force && visitDateStr > todayIST`) stays exactly as is.

## Verification

- Re-query `cron.job` to confirm the new schedule is `30 1 * * *`.
- Tomorrow's `cron.job_run_details` row for this job should show `start_time` at `01:30 UTC`.
- Any pending-approval visitor whose `scheduled_date` equals that day will trigger a host approval email at 7:00 AM IST.

If you'd prefer a different time (e.g. 8:30 AM or 9:00 AM IST), tell me the exact HH:MM and I'll adjust the cron expression.
