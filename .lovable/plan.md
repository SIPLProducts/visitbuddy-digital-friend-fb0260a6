

## Plan — Wire WhatsApp Web bridge end-to-end with `BRIDGE_API_KEY=123456`

### Setup values you're using
- **Laptop `.env`** `BRIDGE_API_KEY=123456`
- **ngrok URL** `https://0279-2401-4900-9777-bcbc-ecfd-f63d-11a7-a243.ngrok-free.app`
- These two values must land in Lovable secrets exactly.

### Step 1 — Confirm `.env` on your laptop
Open `C:\Users\HP\visitbuddy-digital-friend-fb0260a6\whatsapp-bridge\.env` and make sure it contains exactly:
```env
BRIDGE_API_KEY=123456
PORT=3000
SESSION_PATH=./wweb-session
```
Restart bridge (`Ctrl+C` then `node server.js`). Boot log must show `API_KEY set: true`.

⚠️ `123456` is fine for a closed demo only. Anyone who guesses your ngrok URL + this key can send WhatsApp messages from your number. Rotate to a long random string before any real customer demo.

### Step 2 — Set Lovable secrets (I'll do this on approval)
| Secret | Value |
|---|---|
| `WHATSAPP_BRIDGE_URL` | `https://0279-2401-4900-9777-bcbc-ecfd-f63d-11a7-a243.ngrok-free.app` |
| `WHATSAPP_BRIDGE_API_KEY` | `123456` |

The `whatsapp-bridge` edge function already reads both — no code change needed for the proxy itself.

### Step 3 — Verify provider toggle persists where edge functions can read it
I need to inspect:
- `src/components/settings/WhatsAppSettingsPanel.tsx` — where the QR/connect UI lives, and how the `twilio` vs `whatsapp_web` choice is stored
- `src/pages/Settings.tsx` — to confirm the panel is mounted under the WhatsApp tab
- `supabase/functions/send-whatsapp-badge/index.ts` (Twilio) — current message format to mirror
- `supabase/functions/approve-visitor/index.ts` and `notify-host/index.ts` — where badge/host sends fire on approval
- `src/components/visitors/VisitorActions.tsx` — client-side approve button path

If the provider choice currently lives only in component state / localStorage, I'll add a row to `tenant_settings` (or the existing settings table) so server-side functions can read `whatsapp_provider = 'twilio' | 'whatsapp_web' | 'both'`.

### Step 4 — New edge function `send-whatsapp-web-badge`
Mirror `send-whatsapp-badge` but route through `whatsapp-bridge` instead of Twilio:
- Same input shape: `{ visitorName, visitorId, phone, company, purpose, hostName, departmentName, gateName }`
- Same message body & emojis as the Twilio version (so customers receive identical content)
- Same QR via `qrserver.com` passed as `mediaUrl` to `/send`
- Calls `whatsapp-bridge` with `{ action: "send", phone, message, mediaUrl }`
- Returns `{ success, id }` or a structured error

Deployed with `verify_jwt = false` in `supabase/config.toml` (matches the other badge senders).

### Step 5 — Dispatcher in approval flow
Edit `supabase/functions/approve-visitor/index.ts` (and `notify-host` if it sends visitor badges) to:
1. Read `whatsapp_provider` setting
2. If `twilio` → call `send-whatsapp-badge` (current behavior preserved)
3. If `whatsapp_web` → call `send-whatsapp-web-badge`
4. If `both` → call both
5. Email badge continues to fire alongside, unchanged

### Step 6 — Surface clear UI status on the Settings → WhatsApp tab
Make sure `WhatsAppSettingsPanel.tsx` shows:
- Bridge state (`disconnected` / `qr` / `authenticated` / `ready`) polled every 3s
- The QR image when state = `qr`
- A "Send test message" button when state = `ready`
- A clear error toast if the bridge returns `unconfigured` / `unauthorized` / `unreachable` / `timeout` (the proxy already returns these codes)

### Files I'll change
- **New:** `supabase/functions/send-whatsapp-web-badge/index.ts`
- **New:** entry in `supabase/config.toml` setting `verify_jwt = false` for the new function
- **Edit:** `supabase/functions/approve-visitor/index.ts` — provider-aware dispatch
- **Edit (if needed):** `supabase/functions/notify-host/index.ts` — same dispatcher pattern
- **Edit (likely):** `src/components/settings/WhatsAppSettingsPanel.tsx` — persist provider choice to DB, polish status UI
- **Migration:** add `whatsapp_provider` column/row to settings table (only if it isn't already persisted server-side)
- **Secrets via tool:** `WHATSAPP_BRIDGE_URL`, `WHATSAPP_BRIDGE_API_KEY=123456`

### Files unchanged
- `whatsapp-bridge/server.js`, `whatsapp-bridge/package.json`, `whatsapp-bridge/install-chrome.js`, `supabase/functions/whatsapp-bridge/index.ts`, `send-whatsapp-badge` (Twilio), `send-email-badge`

### What you'll see after switch to default mode
1. Lovable secrets updated → `whatsapp-bridge` proxy passes auth
2. Open Settings → WhatsApp tab → QR appears (served from your laptop via ngrok)
3. Scan with phone → status flips to **Connected**
4. Toggle provider to **WhatsApp Web (Demo)** → saved to DB
5. Approve a test visitor → message arrives on visitor's phone from your number with the same badge content as the email
6. Laptop terminal logs `[wweb-bridge] ← send 200`

### Heads-up
- ngrok free URL changes on every restart. Each restart you must update `WHATSAPP_BRIDGE_URL` again.
- Don't sleep the laptop or close the `node server.js` / `ngrok` windows while the demo is running.
- The "no Chrome binary found" warning is cosmetic — Puppeteer's fallback Chrome works (proven by your QR generating). Out of scope for this step.

