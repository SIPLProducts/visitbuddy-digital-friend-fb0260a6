# Plan (on-prem Linux Supabase deployment)

Three independent fixes. All run against your self-hosted server — no hosted-Supabase assumptions.

## 1. Approval SMS reliability (visitor QR + assembly-point link)

Today's flow in `supabase/functions/approve-visitor/index.ts` calls SMS Striker once. If anything in that single attempt fails (transient network blip, provider 5xx after the existing one retry, or an exception thrown before the SMS block runs), the visitor receives nothing — and there is **no server-side fallback**. The browser-side fallback in `ApproveVisitor.tsx` only fires when the host approves from inside the app, not when they tap the email/WhatsApp Approve link (the common path).

Changes (all in `supabase/functions/approve-visitor/index.ts`):
- Wrap the WhatsApp block in its own try/catch so a WhatsApp exception can never skip the SMS block.
- After the Striker block, if `smsSent === false` and `visitor.phone` exists, automatically invoke the existing `send-sms-badge` edge function server-side with the full payload it expects (`visitorName, visitorId, phone, company, purpose, hostName, departmentName, gateName`). Capture result as `smsFallback` in the JSON response.
- Add `location_id` and `gate.name` to every SMS log line so future location-specific failures show up clearly in your edge-runtime logs.
- No template/DLT change. No change to `PUBLIC_SMS_LINK_BASE` (you confirmed it already points at your app domain).

After deploy, redeploy both functions on the server:

```text
supabase functions deploy approve-visitor --no-verify-jwt
supabase functions deploy send-sms-badge --no-verify-jwt
```

## 2. Search inside the header Location dropdown

In `src/components/layout/Header.tsx`, replace the plain `Select` of locations with a `Popover` + shadcn `Command` (already used elsewhere e.g. `HostCombobox`):
- Trigger button stays visually identical (Building2 icon + current location name + chevron).
- Popover opens with `CommandInput` ("Search locations…") and a scrollable `CommandList`.
- HO Admin / Admin Head still get the first "All Locations" item (Crown icon).
- Items show `name (city)` and filter as the user types.
- Selection calls the existing `handleLocationChange` — same `locationChanged` event, no other behaviour change.
- Single-location read-only display path is unchanged.

UI-only change; no backend.

## 3. Morning host-approval reminders (cron not scheduled on server)

The `send-pending-approval-reminders` edge function is correct and runs across **all** locations (no per-location filter), calling `notify-host` for every visitor with `status='pending_approval'` and `scheduled_date = today (IST)`. The missing piece is the daily trigger on your on-prem Postgres.

Because the function URL and anon key are deployment-specific, I'll add a one-shot install script — `deploy/install-reminder-cron.sh` — that:
1. Reads `SUPABASE_URL` and `SUPABASE_ANON_KEY` from `deploy/.env` (same pattern as your existing `deploy/*.sh`).
2. Connects via `psql` and:
   - `CREATE EXTENSION IF NOT EXISTS pg_cron;`
   - `CREATE EXTENSION IF NOT EXISTS pg_net;`
   - Unschedules any pre-existing job named `send-pending-approval-reminders-daily` (idempotent re-run).
   - Schedules it for **08:00 IST = 02:30 UTC** to POST to `<SUPABASE_URL>/functions/v1/send-pending-approval-reminders`.

Cron SQL shape (values come from your `deploy/.env`):

```text
select cron.schedule(
  'send-pending-approval-reminders-daily',
  '30 2 * * *',
  $$ select net.http_post(
       url := '<SUPABASE_URL>/functions/v1/send-pending-approval-reminders',
       headers := jsonb_build_object(
         'Content-Type','application/json',
         'Authorization','Bearer <SUPABASE_ANON_KEY>',
         'apikey','<SUPABASE_ANON_KEY>'
       ),
       body := '{}'::jsonb
     ); $$
);
```

I'll also add a sibling `deploy/diagnose-reminder-cron.sh` that runs:
- `SELECT jobid, schedule, command, active FROM cron.job WHERE jobname='send-pending-approval-reminders-daily';`
- Last 10 rows from `cron.job_run_details` for that job (status, return_message, start/end time).

So after install you can verify the job is firing.

## Out of scope

- Domain change for SMS links (already declined).
- DLT template / SMS provider migration.
- Any RLS or schema changes — none needed.
- Auto-redeploy of edge functions; you'll redeploy with your existing `deploy/redeploy.sh` after the code change.

## Files touched

- `supabase/functions/approve-visitor/index.ts` — fallback + WhatsApp try/catch isolation + log location_id.
- `src/components/layout/Header.tsx` — searchable Command popover for locations.
- `deploy/install-reminder-cron.sh` (new) — one-shot cron installer for on-prem server.
- `deploy/diagnose-reminder-cron.sh` (new) — verify the job + recent runs.
