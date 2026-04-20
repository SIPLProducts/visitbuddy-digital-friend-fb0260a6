

## Send check-in QR on approval, send checkout QR on actual check-in

### What's wrong today
| Stage | Currently sent | Should be sent |
|---|---|---|
| Host approves visitor | **Checkout QR** badge (WhatsApp + Email) | **Check-in QR** badge — visitor shows this at the gate to be scanned in |
| Security checks visitor in (`CheckInCaptureDialog`) | Nothing (just opens print tab) | **Checkout QR** badge (WhatsApp + Email) — visitor shows this when leaving |

The QR scanner (`QrScanner`) already supports both `action: 'checkin'` and `action: 'checkout'` payloads — we just need to send the right one at the right time.

### Two-part fix

**Part 1 — `supabase/functions/approve-visitor/index.ts` → switch to a CHECK-IN QR**

1. Change the QR payload from `action: 'checkout'` to `action: 'checkin'` (line 303).
2. Re-word the WhatsApp + email subjects and bodies so they say "Show this **CHECK-IN** QR at the gate" (not "for quick check-out"). Keep the same branded layout from the previous parity fix — only the QR purpose label and the call-to-action text change. Email subject becomes `"Visit Approved — Show This QR at the Gate"`.
3. The host security notification ("Visitor Approved — ready for check-in") stays as-is.

**Part 2 — Trigger checkout-QR badge on actual check-in**

Update `src/components/visitors/CheckInCaptureDialog.tsx` so that **after** the `status='checked_in'` DB update succeeds (in both `handleUseExistingPhoto` and `handleCapture`), it fires three `supabase.functions.invoke` calls in parallel — never blocking the UI:

```
- send-whatsapp-badge   (phone present)  → checkout QR
- send-email-badge      (email present)  → checkout QR
- send-sms-badge        (phone present)  → short text confirming check-in
```

These existing edge functions already build the **checkout QR** badge (`action: 'checkout'`) with the branded WhatsApp/email template — no changes needed inside them. The dialog will:
- Pass `visitorName, visitorId, phone, email, company, purpose, hostName, departmentName, gateName, checkInTime`.
- Respect the tenant's `whatsapp_provider` setting (the badge functions already do).
- Show a non-blocking toast `"Check-in badge sent via WhatsApp & email"` on success, or a quiet warning if any single channel fails (check-in still succeeds).
- Auto-print tab continues to open as today.

### Resulting end-to-end flow

```
1. Visitor created            → host gets approval WhatsApp + email
2. Host taps Approve          → visitor gets CHECK-IN QR via WhatsApp + email
                                 (subject: "Visit Approved — Show This QR at the Gate")
3. Visitor arrives, security scans the check-in QR
   OR security clicks Check-In in the app
   → status flips to checked_in, photo captured
   → visitor gets CHECKOUT QR via WhatsApp + email + SMS
                                 (subject: "Checked In — Use This QR to Check Out")
4. Visitor leaves, security scans the checkout QR
   → status flips to checked_out
```

### Files touched
- **Edit** `supabase/functions/approve-visitor/index.ts` — flip QR payload to `action: 'checkin'`, rename labels/subjects to "Show this CHECK-IN QR at the gate".
- **Edit** `src/components/visitors/CheckInCaptureDialog.tsx` — after successful check-in, invoke `send-whatsapp-badge`, `send-email-badge`, `send-sms-badge` in parallel (fire-and-forget with toast feedback).

No DB changes, no new secrets, no QR scanner changes (it already routes by `action`).

### What you'll do after I apply the fix

```text
1. Create a new visitor (with phone + email).
2. Host taps Approve in WhatsApp/email.
   → Visitor receives WhatsApp + email saying:
     "Show this CHECK-IN QR at the gate" + QR image.
3. At the gate, security scans the QR (or clicks Check-In in the app)
   → status becomes checked_in, photo captured, badge prints.
   → Visitor receives WhatsApp + email + SMS saying:
     "Checked In — Use This QR to Check Out" + a NEW (checkout) QR image.
4. Visitor leaves and shows the checkout QR
   → scanner flips status to checked_out (already working today).
5. Approve-visitor logs should now show: action: 'checkin' in the QR payload.
   Check-in dialog logs should show three invoke calls for badge channels.
```

### Out of scope
- Vehicle WhatsApp (`send-vehicle-whatsapp`) — separate function, unchanged.
- The QR scanner itself — already handles both actions.
- Self-service portal — uses the same `approve-visitor` flow, gets the upgrade for free.

