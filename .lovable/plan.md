

## What just happened

Your scan worked — `[wweb] ready — sending enabled` proves it. Then a puppeteer navigation inside WhatsApp Web threw an unhandled error and killed the Node process. ngrok then has nothing to forward to → the Settings page shows the same "Failed to send a request" red banner.

This is a known stability issue with `whatsapp-web.js` on Windows + Puppeteer 23. The fix is server-side hardening (process doesn't die) plus an auto-restart wrapper so transient crashes self-heal.

## Plan

### 1) Harden `whatsapp-bridge/server.js`
- Add `process.on('unhandledRejection', ...)` and `process.on('uncaughtException', ...)` handlers that log the error, mark `state = 'disconnected'`, destroy the broken client, and rebuild it after 3 seconds — instead of crashing the whole process.
- Wrap `client.initialize()` in a try/catch with auto-retry (5s backoff).
- On the `disconnected` event, automatically rebuild the client after 3s instead of staying dead.
- Add a `lastError` field exposed on `/status` so the Settings page can show *why* it dropped.

### 2) Add a tiny auto-restart wrapper script
Create `whatsapp-bridge/run.js` — a supervisor that:
- Spawns `node server.js` as a child
- If it exits with a non-zero code, restarts it after 2s (with a max of 10 restarts per minute to avoid crash loops)
- Forwards stdout/stderr so your existing terminal output is unchanged

You'll then run **`node run.js`** instead of `node server.js`. Same one command, but the bridge survives crashes.

### 3) README update
Add a short "If you see Execution context was destroyed" section to `whatsapp-bridge/README.md` explaining:
- Use `node run.js` (not `node server.js`) for stable demos
- Common cause: opening WhatsApp Web in a browser tab on the same number, or sleeping the laptop
- Don't open `web.whatsapp.com` in any browser while the bridge is running on the same number — that triggers the navigation that crashes Puppeteer

### 4) No code changes needed in Lovable
Edge functions, secrets, Settings UI, dispatcher in `approve-visitor` — all already correct. The only failure point is laptop-side process stability.

## Files I'll change

- **Edit** `whatsapp-bridge/server.js` — add global error handlers + auto-rebuild on disconnect
- **New** `whatsapp-bridge/run.js` — supervisor wrapper with auto-restart
- **Edit** `whatsapp-bridge/README.md` — document `node run.js` and the WhatsApp Web tab gotcha

## What you'll do after I implement this

```text
1. cd C:\Users\HP\visitbuddy-digital-friend-fb0260a6\whatsapp-bridge
2. node run.js              ← new command, replaces "node server.js"
3. (ngrok keeps running in its own window — don't restart it)
4. Refresh Settings → WhatsApp tab in Lovable
5. Status will show "Connected" (your phone session is still linked,
   the bridge will reconnect automatically, no re-scan needed)
6. Click "Send Test Message" → message arrives on your phone
7. Approve a real visitor → badge sent via your WhatsApp number
```

If the bridge ever crashes again, `run.js` restarts it within 2 seconds and the saved session reconnects automatically — no manual intervention needed.

## Important: don't open WhatsApp Web in a browser

While `node run.js` is running and your phone is linked to it, **do not open `https://web.whatsapp.com` in Chrome/Edge** on the same number. Doing so triggers WhatsApp to "navigate" the puppeteer-controlled tab, which is exactly the crash you just hit. Use only your phone for WhatsApp during the demo.

## Out of scope

- Switching off `whatsapp-web.js` (Twilio path remains the production-recommended option; Web bridge stays the demo path)
- Migrating to a stable URL (still need ngrok unless you want to set up Cloudflare Tunnel — separate task)

