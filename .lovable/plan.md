

## Why no WhatsApp arrived (and what to fix)

### Root cause
Your edge function logs prove it:

```
[notify-host] whatsapp_provider = twilio
Host notification sent successfully: SM2cbca495d028b926e998d9e10a93adc8
```

The Settings → WhatsApp toggle in the UI is set to "WhatsApp Web", but the **database** (`tenant_settings.whatsapp_provider`) is still `twilio`. So `notify-host` correctly took the Twilio path. Twilio then SMSed your host (different SID prefix `SM` = Twilio SMS, not the bridge), and you saw nothing on the WhatsApp Web side because nothing was sent there.

The **bridge code is already wired correctly** for both host and visitor — it just never gets a chance to run while the DB row says `twilio`.

There's a secondary issue: the **toggle in Settings doesn't appear to be persisting** to the DB (or you didn't click Save after flipping it). This is the actual fix.

### Two-part fix

**Part 1 — Persist the provider toggle (UI bug, real cause)**

Open `src/pages/Settings.tsx` (or whichever parent renders `WhatsAppSettingsPanel`) and verify:
1. The `provider` value passed into `<WhatsAppSettingsPanel provider={...} onProviderChange={...} />` is loaded from `useTenantSettings().settings.whatsapp_provider`.
2. `onProviderChange` calls `updateSettings({ whatsapp_provider: newValue })` **immediately on toggle** (not behind a separate Save button), so the DB row flips the moment the user clicks the switch.
3. After the update, show a `toast.success("Provider switched to WhatsApp Web")` so the user gets feedback.

This single change ensures `[notify-host] whatsapp_provider = whatsapp_web` appears in the next log run, which then triggers the bridge path.

**Part 2 — Make the WhatsApp body match the email content (already true for host, tighten visitor)**

I re-read the host WhatsApp body (lines 441–491) — it **already includes** everything the email shows: visitor name, ID, phone, company, purpose, gate, accompanying persons, date/time, and the approve/reject links. So the host WhatsApp ≡ host email. ✅

The visitor WhatsApp body (lines 551–570) currently says "Check-in Confirmed" even when the visitor is `pending_approval`, which is misleading and doesn't match the visitor email ("Visit Request Submitted — Awaiting Approval"). Fix:
- Use a `pending_approval` variant: title "⏳ Visit Request Submitted", status line "Awaiting host approval", and remove the "your host has been notified" line until status flips to scheduled.
- Keep the existing "Check-in Confirmed" copy for the non-pending direct check-in path.

### Files touched
- **Edit** `src/pages/Settings.tsx` — wire `provider`/`onProviderChange` to `useTenantSettings().settings.whatsapp_provider` and call `updateSettings` on toggle, with toast confirmation.
- **Edit** `supabase/functions/notify-host/index.ts` — split visitor WhatsApp body into pending vs. checked-in variants (parity with visitor email).

### What you'll do after I apply the fix

```text
1. Settings → WhatsApp → flip the "Use WhatsApp Web (Demo)" switch.
   Toast appears: "Switched to WhatsApp Web". Active provider chip turns secondary.
2. Reload the page → toggle stays on (proves it persisted).
3. Make sure the bridge terminal still shows: [wweb] ready — sending enabled
4. Create a new visitor (host with phone, visitor with phone + email).
5. Within ~5 s expect:
   - Host's WhatsApp (from YOUR scanned number): full approval message with
     visitor name, ID, mobile, company, purpose, gate, date/time, accompanying
     persons, ✅ Approve and ❌ Reject links — same content as the email.
   - Visitor's WhatsApp: "⏳ Visit Request Submitted — Awaiting Host Approval"
     with their visitor ID, host, gate, date/time.
   - Host's email: unchanged.
   - Visitor's email: unchanged.
6. Check edge function logs — should now read:
   [notify-host] whatsapp_provider = whatsapp_web
   Host notification sent via bridge: <id>
   Visitor confirmation sent via bridge: <id>
7. Tap Approve link in the host's WhatsApp → status flips to scheduled →
   approve-visitor sends the badge over the bridge too (already working).
```

### Out of scope
- Vehicle WhatsApp (`send-vehicle-whatsapp`) — separate function.
- Render deployment / ngrok stable URL — separate task.

