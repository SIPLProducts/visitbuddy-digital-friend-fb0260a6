## Context

The `vms.resustainability.com` deployment is **on-prem**, running its own Supabase stack on a Linux server. The cron schedule I updated yesterday only affected the Lovable-hosted backend — the on-prem server has its own `pg_cron` job that is independent and must be installed/repaired there. If that job is missing, never fired, or the edge function call fails, no future-dated host approval emails will go out.

## Likely root causes on the on-prem stack

1. `pg_cron` / `pg_net` extensions not enabled in the on-prem Postgres.
2. The cron job `send-pending-approval-reminders-daily` was never installed (script not run) or was installed at the old time.
3. The cron job fires but the HTTP call to `http://.../functions/v1/send-pending-approval-reminders` fails (wrong `SUPABASE_URL`, missing `SUPABASE_ANON_KEY`, edge runtime down, internal DNS to the functions container broken).
4. The reminder function runs but `notify-host` re-invocation fails for the same per-location SMTP/Twilio issues you've hit before.

## Plan

### 1. Add an enhanced on-prem diagnostic script

Create / strengthen `deploy/diagnose-reminder-cron.sh` so the user can run a single command on their server and paste the output back. New checks:

- Confirm `pg_cron` and `pg_net` extensions are installed.
- Show the cron job row (schedule, active, command preview) — flag if schedule is **not** `30 0 * * *`.
- Show the last 20 runs from `cron.job_run_details` with status and return message.
- Show the last 20 `net._http_response` rows linked to the job's requests (status code + response body) — this exposes HTTP-level failures the cron table hides.
- Run a manual `SELECT net.http_post(...)` against the local reminder endpoint and print the resulting status — proves end-to-end reachability.
- Print today's pending visitors that *should* receive a reminder today (IST), so we can confirm there is actually data to send.

### 2. Make the install script self-healing

Update `deploy/install-reminder-cron.sh` so re-running it on-prem:

- Verifies `SUPABASE_URL` is reachable from inside Postgres (warns if `localhost`/Docker DNS will not resolve from the DB container — the URL must be reachable from the **DB**, not from the host shell).
- Drops the old job (whatever schedule) and reinstalls at `30 0 * * *` (06:00 IST).
- Emits a clear "next steps" block telling the user to run the diagnose script and to also fire the function manually with `curl` to isolate the failure layer.

### 3. Harden `send-pending-approval-reminders` for visibility

Edit `supabase/functions/send-pending-approval-reminders/index.ts`:

- Log a summary line: `IST date`, total candidates, count notified OK, count failed — searchable in `docker logs` on-prem.
- Accept an optional JSON body `{ date: "YYYY-MM-DD" }` so the user can replay a specific date manually from `curl` for testing (defaults to today IST when omitted).
- Return per-visitor failures with HTTP status from the `notify-host` call so failures aren't silent.

### 4. User runbook (delivered as chat message after deploy)

Concrete on-prem steps the user must execute on `vms.resustainability.com`:

```bash
cd /path/to/deploy
./install-reminder-cron.sh          # reinstall at 06:00 IST
./diagnose-reminder-cron.sh         # paste output back if anything is red
# Manual fire (proves the HTTP path, independent of cron):
curl -s -X POST \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "$SUPABASE_URL/functions/v1/send-pending-approval-reminders" | jq .
```

The response from the manual fire will tell us which layer is broken (cron / HTTP / function / notify-host / SMTP-Twilio).

## Out of scope

- No change to the hosted Lovable backend (already at 06:00 IST).
- No change to `notify-host` deferral logic.
- No SMTP / Twilio template changes.

## Question before I build

Do you have shell + `psql` access to the on-prem server right now to run the diagnose script, or do you need me to make the script also dump its findings to a file (e.g., `/tmp/reminder-diagnose.log`) that you can email out?