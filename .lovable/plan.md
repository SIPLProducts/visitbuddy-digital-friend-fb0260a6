

## Understanding

For **demo purposes only**, add WhatsApp Web automation alongside the existing Twilio integration. Twilio remains the production path; WhatsApp Web is a temporary demo channel that lets the user scan a QR code in Settings, connect their personal WhatsApp, and have approval messages auto-sent through it.

A toggle in Settings picks the active provider (`twilio` | `whatsapp_web`). Approval flow checks the toggle and routes accordingly. No removal of Twilio code.

## Hard constraint (must be acknowledged)

WhatsApp Web automation (`whatsapp-web.js` / Baileys) requires a **persistent Node.js server with headless Chromium** running 24/7. Supabase Edge Functions are stateless and short-lived — they cannot host the WhatsApp session. So this needs:

- **An external bridge server** (Node + `whatsapp-web.js` + Express) hosted somewhere you control: Render, Railway, Fly.io, a VPS, or even your laptop with ngrok for the demo.
- Lovable side only acts as a **proxy** to that bridge.

I will write the bridge server source code into the repo at `whatsapp-bridge/` (with README + Dockerfile), but **you must deploy and run it** outside Lovable. For a quick demo, running it locally + ngrok works fine.

Also: WhatsApp may ban the number — use a **dedicated demo SIM**, not personal/business.

## Plan

### 1. Bridge server (you deploy externally)
New folder `whatsapp-bridge/` containing:
- `server.js` — Express + `whatsapp-web.js` with `LocalAuth` (session persists on disk)
- Endpoints: `GET /qr` (current QR data URL), `GET /status`, `POST /send` ({phone, message, mediaUrl}), `POST /logout`
- `BRIDGE_API_KEY` header check on all endpoints
- `package.json`, `Dockerfile`, `README.md` with deploy steps (Render/Railway/local+ngrok)

### 2. Add runtime secrets in Lovable
- `WHATSAPP_BRIDGE_URL` — public URL of bridge
- `WHATSAPP_BRIDGE_API_KEY` — shared secret

### 3. New Edge Function `whatsapp-bridge` (proxy)
`supabase/functions/whatsapp-bridge/index.ts` with action router: `qr` | `status` | `send` | `logout`. Forwards to bridge with the API key. Register in `supabase/config.toml` with `verify_jwt = false`.

### 4. Settings UI — new "WhatsApp Web (Demo)" tab
In `src/pages/Settings.tsx`:
- Provider toggle: **Twilio (Production)** ↔ **WhatsApp Web (Demo)** — stored in `tenant_settings` (new column `whatsapp_provider text default 'twilio'`)
- Demo warning banner about ToS / ban risk
- "Connect WhatsApp" button → polls `?action=qr` every 3s, displays QR image until status flips to `ready`
- Connection status badge: Disconnected / Awaiting Scan / Connected
- "Disconnect" button

### 5. Wire into approval flow
In `supabase/functions/approve-visitor/index.ts`:
- Read `whatsapp_provider` from `tenant_settings`
- If `whatsapp_web`: call `whatsapp-bridge` with action `send`, body `{phone, message, mediaUrl: qrCodeUrl}`
- If `twilio` (default): keep existing `send-whatsapp-badge` call
- On bridge failure, fall back to Twilio and log warning

Twilio code remains 100% intact for `notify-host`, `send-vehicle-whatsapp`, etc. — only the approval message is dual-routed for the demo.

### 6. DB migration
Add column `whatsapp_provider text not null default 'twilio'` to `tenant_settings` with check constraint `in ('twilio','whatsapp_web')`.

## Files affected

- **New** `whatsapp-bridge/server.js`, `package.json`, `Dockerfile`, `README.md` (you deploy)
- **New** `supabase/functions/whatsapp-bridge/index.ts`
- `supabase/config.toml` — register function (`verify_jwt = false`)
- `supabase/functions/approve-visitor/index.ts` — provider switch
- `src/pages/Settings.tsx` — new WhatsApp Web tab
- `src/hooks/useTenantSettings.ts` — add `whatsapp_provider` field
- DB migration — add `whatsapp_provider` column

## What you do after I implement

1. `cd whatsapp-bridge && npm install && node server.js` (or deploy to Render).
2. If local: `ngrok http 3000` → copy HTTPS URL.
3. Add `WHATSAPP_BRIDGE_URL` + `WHATSAPP_BRIDGE_API_KEY` secrets in Lovable.
4. Settings → WhatsApp Web tab → Connect → scan QR with WhatsApp app.
5. Switch provider toggle to "WhatsApp Web (Demo)".
6. Approve a test visitor → message arrives from your scanned number.
7. After demo, flip toggle back to Twilio.

