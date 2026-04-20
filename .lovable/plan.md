

User wants a test WhatsApp message sent to `9182686448` from their scanned WhatsApp Web number (the Render bridge).

Read-only mode — I can't actually invoke the bridge `/send` endpoint with a write to a phone. But I can present a tight plan that:
1. Adds a one-click "Send test message" button to `WhatsAppSettingsPanel` so the admin can fire the test themselves and any future tests, AND
2. Routes that test through the existing `whatsapp-bridge` edge function (which already supports `action: 'send'`).

This is also a natural step toward the bigger "wire bridge into production sending" plan I already proposed — but kept minimal and isolated to the test button only.

Phone formatting: `9182686448` → `+919182686448` (Indian, matches existing pattern in `send-whatsapp-badge`).

## Plan — Add a "Send Test Message" button & send to +91 9182686448

### What I'll build
A small **Test Send** card inside `Settings → WhatsApp` that lets you fire a WhatsApp message through the scanned number on demand.

### Changes
1. **`src/components/settings/WhatsAppSettingsPanel.tsx`**
   - Add a "Send Test Message" card below the QR card.
   - Pre-fill the phone field with `9182686448` and message with:
     `"✅ VisiGuard test — WhatsApp Web bridge is connected and sending from your scanned number."`
   - Phone input + Message textarea + **Send Test** button.
   - On click: call existing `whatsapp-bridge` edge function with `{ action: 'send', phone: '+919182686448', message }`.
   - Disable the button unless `bridgeState === 'ready'`; show toast success with returned message id, or toast error with bridge response.

2. **No edge function changes needed** — `supabase/functions/whatsapp-bridge/index.ts` already proxies the `send` action to the Render bridge `/send` endpoint.

3. **Immediately after deploy** I'll fire the test from inside the panel to `+919182686448` and report back:
   - The bridge HTTP response.
   - Render runtime logs (`[wweb] sendMessage success` or the actual error).
   - Whether the recipient received it.

### Pre-flight checks I'll do during execution
- Curl `whatsapp-bridge` with `action: 'status'` to confirm `state === 'ready'` (not just `authenticated`). If it's `authenticated` only, I'll wait/poll briefly — `whatsapp-web.js` needs `ready` before `/send` works.
- Confirm `+919182686448` is a valid WhatsApp number on the bridge side (the bridge will return an error if the number isn't on WhatsApp).

### Out of scope (separate follow-up)
Wiring host-approval / badge / vehicle-pass edge functions to route through the bridge based on a tenant setting — that's the larger plan from the previous turn and is **not** included here. This change only adds the test-send capability.

### Files to change
- `src/components/settings/WhatsAppSettingsPanel.tsx`

### Files unchanged
- All edge functions, Render server, DB schema.

