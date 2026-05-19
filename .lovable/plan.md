# Stop duplicate SMS after check-in

## Problem

After host approval the visitor correctly receives one SMS with the QR link. After they scan, capture a photo and are marked `checked_in`, the app fires a second round of badge channels — including the same SMS — which the visitor experiences as a duplicate.

## Root cause

Two code paths run a `sendCheckoutBadges()` helper as soon as a visitor's status flips to `checked_in`:

- `src/pages/CheckInOut.tsx` (lines 98–134) — invokes `send-whatsapp-badge`, `send-sms-badge`, and `send-email-badge`.
- `src/components/visitors/CheckInCaptureDialog.tsx` (lines 75–123) — same three invocations.

The helper was originally intended to deliver a "check-out QR" so the visitor can self-checkout later, but the SMS template used by `send-sms-badge` is identical to the approval SMS (same `?<shortcode>` link), so it looks like a duplicate of the approval message.

The approval-time SMS is sent only once from the `approve-visitor` Edge Function and is correct.

## Fix

Remove the `send-sms-badge` invocation from the post-check-in dispatch in both files. SMS will then be sent exactly once — at host approval. WhatsApp and email post-check-in delivery stay as they are (those channels are not duplicates the user complained about, and WhatsApp/email are free/cheap and visitors expect a confirmation).

### Files to change

1. `src/pages/CheckInOut.tsx`
   - In `sendCheckoutBadges`, delete the line that pushes `send-sms-badge` into `tasks`.
   - Update the success toast text from "WhatsApp & email" to just "WhatsApp & email" (already correct after removal).

2. `src/components/visitors/CheckInCaptureDialog.tsx`
   - Same change: drop the `send-sms-badge` push inside `sendCheckoutBadges`.

No backend / Edge Function / DB changes. The `send-sms-badge` function itself stays (it is still used by the manual "Resend SMS" action in `BadgePrinting.tsx`).

## Out of scope

- WhatsApp and email post-check-in messages (kept).
- Manual resend from `BadgePrinting.tsx` (kept — that's a deliberate user action).
- `approve-visitor` SMS (already correct, sends once).

## Verification after deploy

1. Approve a new visitor → 1 SMS received. ✅
2. Open link, scan QR, capture photo, get "checked in". → No additional SMS arrives. ✅
3. WhatsApp/email confirmation still arrive post check-in.
