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

### Option A — Docker (recommended, most reliable)

The repo includes a `Dockerfile` that installs system Chromium and is the most
reliable way to host this bridge.

On Render: create a new **Web Service** → **Language: Docker** → root directory
`whatsapp-bridge`. Then set environment variables:

- `BRIDGE_API_KEY` — long random string (must match `WHATSAPP_BRIDGE_API_KEY` in Lovable)
- `SESSION_PATH` — `/data/wweb-session` (attach a persistent disk mounted at
  `/data` so the WhatsApp session survives restarts and you don't have to
  re-scan the QR)
- `PORT` — usually injected by the platform

No `PUPPETEER_*` variables are needed in this mode — the Dockerfile already sets
`PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`.

### Option B — Native Node service on Render

If you deploy as a plain Node service (not Docker), Render does **not** ship
Chromium. The included `postinstall` script downloads it during build into
`./.puppeteer-cache` **inside the project tree** so it survives into runtime
(Render wipes `~/.cache/puppeteer` between build & run — that's the cause of
the `Could not find Chrome` error).

`server.js` also sets `PUPPETEER_CACHE_DIR` at boot as a safety net.

1. Render dashboard → **New → Web Service** → connect your repo.
2. **Settings**:
   - **Runtime**: Node
   - **Root Directory**: `whatsapp-bridge`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
3. **Environment → Add Environment Variable**:
   - `BRIDGE_API_KEY` — long random string (must match `WHATSAPP_BRIDGE_API_KEY` in Lovable)
   - `PUPPETEER_CACHE_DIR` = `/opt/render/project/src/whatsapp-bridge/.puppeteer-cache`
   - `SESSION_PATH` = `/opt/render/project/src/whatsapp-bridge/wweb-session`
     *(or attach a Persistent Disk mounted at `/data` and use `/data/wweb-session` so the QR survives restarts)*
   - `PORT` is auto-injected by Render — leave it unset.
4. **Manual Deploy → Clear build cache & deploy**.
5. Watch the **build** logs for `Downloading Chrome` (~170 MB, ~1 min first
   time, then cached). The line ends with the install path — confirm it points
   inside `/opt/render/project/src/whatsapp-bridge/.puppeteer-cache`.
6. Watch the **runtime** logs — the bridge prints its effective paths on boot:
   ```text
   [wweb-bridge] PUPPETEER_CACHE_DIR: /opt/render/project/src/whatsapp-bridge/.puppeteer-cache
   ```
   Then you should see `[wweb] QR generated, scan with WhatsApp app.` — open
   VisiGuard → **Settings → WhatsApp** to scan it.

### Notes for Render free tier

- The instance **sleeps after ~15 min** of inactivity. The first request after
  sleep takes ~10–20 sec while Chrome relaunches. Use the **Starter** plan +
  a Persistent Disk for a stable demo.
- Without a Persistent Disk, the WhatsApp session at `SESSION_PATH` is wiped
  on every redeploy → you'll need to scan the QR again.

After deploy on either option, point the Lovable secret `WHATSAPP_BRIDGE_URL`
at the public URL (no trailing slash).

### Troubleshooting

- **`Could not find Chrome (ver. X)`** in runtime logs → either the build
  didn't download Chromium (check build logs for the download step) or
  `PUPPETEER_CACHE_DIR` is unset/wrong (check the boot log line above). The
  fastest fix is to switch to Docker deploy (Option A).
  As a hard override, set `PUPPETEER_EXECUTABLE_PATH` directly to the
  installed binary, e.g.
  `/opt/render/project/src/whatsapp-bridge/.puppeteer-cache/chrome/linux-131.0.6778.204/chrome-linux64/chrome`,
  then **Clear build cache & deploy**.
- **Two Chrome installs in build logs** (one in `.puppeteer-cache`, one in
  `/opt/render/.cache/puppeteer`) → your Render **Build Command** still has
  `&& npx puppeteer browsers install chrome` appended. Remove it — leave
  only `npm install`. The `postinstall` script already installs Chrome into
  the project-local cache.
- **Node version warning** → pin Render to Node 20 by keeping `"engines": { "node": "20.x" }`
  in `whatsapp-bridge/package.json` (already set). Newer Node majors can
  break `whatsapp-web.js` / `puppeteer`.
- **`Bridge unavailable`** in the Lovable Settings UI → the Render service is
  asleep or crashed. Open `https://<your-bridge>.onrender.com/health` in a
  browser to wake it; check Render logs.

## 3. Disconnect

In Settings → WhatsApp tab → **Disconnect** to clear the session. Or call
`POST /logout` on the bridge directly.
