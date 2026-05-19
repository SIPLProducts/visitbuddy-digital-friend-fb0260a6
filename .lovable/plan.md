# Fix SMS delivery on visitor approval

## Diagnosis

From the last approval logs:
- `SMS Striker accepted (jobId=1892895491) — Messages has been sent` to `7995122017`. Our app DID submit the SMS successfully (HTTP 200).
- BUT the SMS body still uses the OLD format: `... QR Link: https://visiguard.sharvisoftwareservices.com/visitor/VIS-...`. We updated `send-sms-badge` last turn, but `approve-visitor` has its OWN duplicate SMS code path that was never updated.

The most likely reason no SMS reached the handset: the **DLT-registered template** at SMS Striker / TRAI expects a specific wording. If the live message body no longer matches the approved template variant character-for-character, the operator silently drops it (accepted by aggregator → filtered by carrier). Our recent change made `send-sms-badge` emit `Click: .../click/<code>` while `approve-visitor` still emits `QR Link: .../visitor/<id>`. One of these is now off-template — and the approval path is the one that just failed delivery.

## Changes

### 1. `supabase/functions/approve-visitor/index.ts` (~lines 516–519, plus log payload + sms_logs row)
Replace:
```ts
const qrLink = `https://visiguard.sharvisoftwareservices.com/visitor/${cleanUrlPart(visitor.visitor_id)}`;
const strikerMsg = `Dear ${visitorName}, Your visitor access for ${companyName} is confirmed on ${visitDate} at ${gateName}. QR Link: ${qrLink} Host: ${hostName} FROM ${fromName} Regards: RE SUSTAINABILITY LIMITED`;
```
With:
```ts
const clickLink = `https://visiguard.sharvisoftwareservices.com/click/${cleanUrlPart(visitor.visitor_id)}`;
const strikerMsg = `Dear ${visitorName}, Your visitor access for ${companyName} is confirmed on ${visitDate} at ${gateName}. Click: ${clickLink} Host: ${hostName} FROM ${fromName} Regards: RE SUSTAINABILITY LIMITED`;
```
Update the `loggedPayload` (`qrLink` → `clickLink`) and the `sms_logs.message` value accordingly. This brings approve-visitor in sync with `send-sms-badge` (single source of truth).

### 2. Extra reliability tweaks in `approve-visitor`
- Log the full SMS Striker response body in both success and failure branches (already partially there) so we can see operator-level rejection reasons.
- Also write a row into `sms_logs` even when `SMS_STRIKER_KEY` is missing so the Settings page surfaces the misconfiguration.

### 3. Live verification after deploy
After you create a visitor and approve them, I will:
- Pull the latest `approve-visitor` edge logs to confirm the new `Click:` payload was used and SMS Striker returned 200.
- Query `sms_logs` for `recipient_phone='7995122017'` to show provider job id + status.
- If SMS Striker reports OK but the phone still does not ring, the remaining cause is the DLT template registration at the `RESUST` header — that is a portal action on your DLT provider (re-register the template body that now contains the word `Click:` and the `/click/` URL), not code. I will flag this clearly with the exact template string to copy-paste into the DLT portal.

## Out of scope
- `send-sms-badge` (already correct from last turn).
- WhatsApp, email, RLS, DB schema, frontend routes.
- DLT template re-registration on the SMS Striker portal (manual portal step on your side if delivery still fails after the code fix).

## Files touched
- `supabase/functions/approve-visitor/index.ts` — SMS body + logged payload + sms_logs message string.

No other files change.
