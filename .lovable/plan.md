## Goal
After Host A transfers an approval to Host B and Host B approves from the email, the visitor must receive the SMS badge — same as a direct approval.

## Why we can't see the cause directly
Both the direct-approve and transfer-then-approve flows funnel through the same edge function (`approve-visitor`), and its SMS code path does not branch on whether a transfer happened — it only looks at `visitor.phone` + `SMS_STRIKER_KEY`. Yet you see the success screen, which means the function returned `200` but the SMS sub-step silently no-op'd or failed (it doesn't block the response). The UI also lies — it always says "Badge sent via WhatsApp & SMS" regardless of the `notifications.sms` flag the function returns.

So the plan is in two parts: **(A) instrument and surface the real status**, and **(B) add a safe fallback so SMS gets re-sent if the primary attempt didn't go out**.

## Part A — Make the failure visible

1. **`src/pages/ApproveVisitor.tsx`** — stop claiming success blindly. Read `data.notifications` from the edge-function response and:
   - Show "Badge sent via WhatsApp & SMS" only if both flags are true.
   - Show "Approved — SMS could not be sent automatically. Resending…" when `sms === false`, and trigger the fallback (Part B).
   - Surface a small diagnostic line on the success screen: `SMS: sent / not sent`, `WhatsApp: sent / not sent`, `Email: sent / not sent` so the host can tell at a glance.

2. **`supabase/functions/approve-visitor/index.ts`** — add explicit, greppable log lines so on-prem logs make the cause obvious:
   - `[approve-visitor] SMS skipped: SMS_STRIKER_KEY missing`
   - `[approve-visitor] SMS skipped: visitor.phone is empty (visitorId=…, host_id=…)`
   - `[approve-visitor] SMS skipped: invalid Indian mobile '<raw>' -> '<10digits>'`
   - `[approve-visitor] SMS attempt: visitorId=… phone=… afterTransfer=<bool>` (compute `afterTransfer` by checking `audit_logs` for a `visitor_approval_transferred` row for this visitor in the last 24h — purely for diagnostics).
   - Also include a `smsSkipReason` string in the JSON response when `sms === false`, so the UI can show it.

## Part B — Fallback re-send so the visitor always gets the SMS

3. **`src/pages/ApproveVisitor.tsx`** — when the response says `sms === false` (and the action was approve), automatically invoke the existing `send-sms-badge` edge function for the same `visitorId`. It already builds the same DLT-approved message and is the same code path the "Resend SMS" button uses elsewhere, so this is safe to call. Show the final toast based on whether the fallback succeeded.

4. **`supabase/functions/approve-visitor/index.ts`** — when the SMS Striker call returns a non-accepted response or throws, do one immediate in-function retry (single attempt, fresh `fetch`) before recording failure. Most transient provider failures are a single 5xx blip.

## Part C — One real correctness fix in the transfer flow

5. **`supabase/functions/transfer-visitor-approval/index.ts`** — when `notify-host` is invoked after transfer, also pass `force: true` (already passes it) **and** explicitly include the original caller's `origin` header so the email link in the new host's mail points back to the same on-prem deployment. If the origin is missing (e.g., called server-to-server), fall back to `tenant_settings.public_app_url`. This avoids the case where the new host clicks an approve link that lands on a different deployment whose `SMS_STRIKER_KEY` is not configured (which would also produce exactly the symptom you describe: success screen, no SMS). The current code already forwards origin — verify it isn't being dropped when the transfer is initiated from the public `/transfer-approval` page (anon session).

## What this gives you
- Even before you find the root cause, every transferred-and-approved visitor will get the SMS (Part B fallback).
- The next time it happens, the on-prem Edge Function logs will show one specific `[approve-visitor] SMS skipped:` line that names the exact reason, and the new host will see it on screen.
- If the cause is the deployment-URL mismatch, Part C eliminates it.

## Files touched
- `src/pages/ApproveVisitor.tsx`
- `supabase/functions/approve-visitor/index.ts`
- `supabase/functions/transfer-visitor-approval/index.ts`

## Out of scope
No DB schema changes, no UI redesign, no changes to the transfer page itself, no changes to `notify-host` beyond what Part C requires (and only if needed).
