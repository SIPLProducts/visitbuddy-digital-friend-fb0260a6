# VisiGuard — WhatsApp Web Bridge (DEMO ONLY)

A tiny Node service that hosts a `whatsapp-web.js` session and exposes a small HTTP
API. The VisiGuard app (running on Lovable Cloud) calls this bridge through the
`whatsapp-bridge` Edge Function to send approval messages from your **own
WhatsApp number** during demos.

## ⚠️ Read this first

- Uses unofficial WhatsApp Web automation. **WhatsApp may ban the number** without
  warning, especially when sending bulk/automated messages.
- Use a **dedicated demo SIM**, never your personal/business number.
- For production, switch the toggle in **VisiGuard → Settings → WhatsApp** back
  to **Twilio (Production)** — the official WhatsApp Business API.

## Endpoints

All endpoints require header `x-api-key: <BRIDGE_API_KEY>`.

| Method | Path     | Body                                | Returns |
| ------ | -------- | ----------------------------------- | ------- |
| GET    | /health  | —                                   | `{ ok: true }` |
| GET    | /status  | —                                   | `{ state, hasQr }` |
| GET    | /qr      | —                                   | `{ state, qr }` (qr is data URL or null) |
| POST   | /send    | `{ phone, message, mediaUrl? }`     | `{ success, id }` |
| POST   | /logout  | —                                   | `{ success }` |

`state` is one of: `disconnected | qr | authenticated | ready`.

## 1. Run locally for a quick demo

```bash
cd whatsapp-bridge
npm install
BRIDGE_API_KEY="some-long-random-string" node server.js
```

In another terminal, expose it via ngrok:

```bash
ngrok http 3000
# copy the https://....ngrok-free.app URL
```

Then in **Lovable → Project → Settings → Secrets**, add:

- `WHATSAPP_BRIDGE_URL` = your ngrok HTTPS URL (no trailing slash)
- `WHATSAPP_BRIDGE_API_KEY` = the same string you used above

Open VisiGuard → **Settings → WhatsApp** tab → **Connect WhatsApp**.
A QR code appears — scan it from the WhatsApp mobile app
(*Settings → Linked Devices → Link a Device*). Once status flips to **Connected**,
flip the provider toggle to **WhatsApp Web (Demo)** and approve a test visitor.

## 2. Deploy on Render / Railway / Fly.io

The repo includes a `Dockerfile`. Set environment variables on the host:

- `BRIDGE_API_KEY` — long random string
- `PORT` — usually injected by the platform
- `SESSION_PATH` — `/data/wweb-session` (mount a persistent disk on `/data` so the
  WhatsApp session survives restarts and you don't have to re-scan the QR)

After deploy, point the Lovable secret `WHATSAPP_BRIDGE_URL` at the public URL.

## 3. Disconnect

In Settings → WhatsApp tab → **Disconnect** to clear the session. Or call
`POST /logout` on the bridge directly.
