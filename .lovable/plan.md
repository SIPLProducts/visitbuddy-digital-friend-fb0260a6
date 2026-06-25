## Goal
Send the host approval email (and WhatsApp) immediately when a visitor is created, even if the scheduled visit date is in the future. Today the `notify-host` function defers all host channels for future-dated visits and relies on the morning cron to resend.

## Change

**`supabase/functions/notify-host/index.ts`**
- Remove the future-date deferral. Set `skipHost = false` unconditionally (keep the `force` parameter for backward compatibility with the cron reminder).
- Effect: hosts get the approval email + WhatsApp instantly at registration regardless of `scheduled_date`.
- All other logic (visitor confirmation email, approve/reject/transfer links, branding, logging) stays the same.

## Kept as-is
- The 06:00 IST `send-pending-approval-reminders` cron still runs. It now functions as a same-day reminder for any still-pending future visits — harmless duplication, useful safety net. No changes to that function or cron.
- `approve-visitor`, SMS flow, and visitor-side emails are untouched.

## Deploy
- Hosted: redeploy `notify-host` automatically.
- On-prem (`vms.resustainability.com`): user pulls latest and runs `./deploy/restart-edge-functions.sh` to pick up the new function code.

## Verification
1. Create a visitor with `scheduled_date` = tomorrow.
2. Confirm host receives the approval email immediately (check inbox + `email_logs`).
3. Confirm Approve/Reject links work from that email.
