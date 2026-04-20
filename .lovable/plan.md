

## Diagnosis confirmed

Two issues from your Render logs:
1. **Chrome missing** — `whatsapp-web.js` uses Puppeteer which needs Chromium. Render's Node environment doesn't have it, and the current `package.json` doesn't install it.
2. **API_KEY was `false` on first boot** — already fixed itself on the second deploy (`API_KEY set: true`). Ignore.

Render is running as a plain **Node service**, not Docker, so the `Dockerfile` (which had Chromium) is being skipped. The `package.json` needs to install Chromium itself during build.

## Fix (one file change + one Render setting)

### 1. Update `whatsapp-bridge/package.json`
Add a `postinstall` script that downloads Chromium during Render's build, and pin a Chrome version env-var so Puppeteer downloads the exact one `whatsapp-web.js` expects.

```json
{
  "name": "visiguard-whatsapp-bridge",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "postinstall": "npx puppeteer browsers install chrome"
  },
  "dependencies": {
    "express": "^4.19.2",
    "puppeteer": "^23.0.0",
    "qrcode": "^1.5.4",
    "whatsapp-web.js": "^1.26.0"
  },
  "engines": { "node": ">=18" }
}
```

Adding `puppeteer` (full package, not `-core`) gives a working browser fetcher; the `postinstall` then pulls the matching Chromium into `/opt/render/.cache/puppeteer`.

### 2. Update Render service settings
- **Build Command**: `npm install` (default — postinstall will run automatically)
- **Add environment variable**: `PUPPETEER_CACHE_DIR` = `/opt/render/project/src/.cache/puppeteer`
  *(This survives across deploys on Render's persistent project dir; the default `~/.cache` gets wiped between builds, which is the root cause.)*
- Click **Manual Deploy → Clear build cache & deploy**.

### 3. (Optional but recommended) Render render.yaml
Not required — the two changes above are enough. Keep `Dockerfile` as a fallback for self-hosting.

## What happens after deploy

- Build logs will show `Downloading Chromium...` (~150 MB, takes ~1 min the first time, cached after).
- `node server.js` starts → `whatsapp-web.js` finds Chrome at the cache path → QR generation works.
- Lovable Settings → WhatsApp → **Connect WhatsApp** → QR appears within ~5–10 seconds.

## Files to change

- `whatsapp-bridge/package.json` — add `puppeteer` dep + `postinstall` script

That's the only code change. Everything else is in your Render dashboard.

