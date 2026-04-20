

User is deploying the `whatsapp-bridge` to Render (non-Docker, native Node environment) and Puppeteer can't find Chrome at `/opt/render/.cache/puppeteer`. Need a Docker-free fix.

Root cause: On Render's free/standard Node runtime, `npm install --omit=dev` runs but `postinstall` runs `npx puppeteer browsers install chrome` — this download succeeds at build time into a build cache directory, but at runtime Render mounts a different filesystem, so Chrome is gone OR the path mismatches. Also, with `--omit=dev`, puppeteer's full package may be skipped depending on dependency placement.

The robust fix without Docker: install Chrome into a path **inside the project source tree** (`./.puppeteer-cache`) so it persists into runtime, and point Puppeteer at it explicitly via `PUPPETEER_CACHE_DIR`. Render persists everything under `/opt/render/project/src` between build and runtime — but NOT `~/.cache`. That's exactly the bug.

## Plan

Make the WhatsApp bridge work on Render's native Node runtime (no Docker) by relocating Puppeteer's Chrome cache into the project directory.

### 1. `whatsapp-bridge/package.json` — fix install + cache location

- Move `puppeteer` out of being a transitive-only dep (already a direct dep ✓).
- Replace `postinstall` with one that installs Chrome into a project-relative folder:
  ```
  "postinstall": "PUPPETEER_CACHE_DIR=$(pwd)/.puppeteer-cache npx puppeteer browsers install chrome"
  ```
- Drop `--omit=dev` reliance (Render's default `npm install` is fine for this single-purpose service; document below).

### 2. `whatsapp-bridge/server.js` — point Puppeteer at the project cache at runtime

Add at the very top, before `import pkg from 'whatsapp-web.js'`:
```js
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
if (!process.env.PUPPETEER_CACHE_DIR) {
  process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.puppeteer-cache');
}
```
This guarantees runtime reads from the same folder build wrote to.

### 3. `whatsapp-bridge/.gitignore` (new)

```
node_modules
wweb-session
.puppeteer-cache
```

### 4. `whatsapp-bridge/README.md` — Render deploy section (new/updated)

Add a "Deploy to Render (no Docker)" block:

- Service type: **Web Service** → Runtime **Node**
- Root Directory: `whatsapp-bridge`
- Build command: `npm install`
- Start command: `node server.js`
- Environment variables:
  - `BRIDGE_API_KEY` = strong random string (set the same value in Lovable secret `WHATSAPP_BRIDGE_API_KEY`)
  - `SESSION_PATH` = `/opt/render/project/src/whatsapp-bridge/wweb-session` (so the QR scan persists across restarts on Render's persistent disk; on free tier it resets, that's expected)
  - `PUPPETEER_CACHE_DIR` = `/opt/render/project/src/whatsapp-bridge/.puppeteer-cache` (explicit, matches what `postinstall` wrote)
  - `PORT` = `10000` (Render auto-injects, no action needed)
- After first deploy, copy the Render URL (`https://whatsapp-integration-vvms.onrender.com`) into Lovable secret `WHATSAPP_BRIDGE_URL`.

Also note: Render's free tier sleeps after 15 min of inactivity — first request after sleep will trigger a fresh Chrome launch (~10–20 sec). For a steady demo, use the **Starter plan** + a **Persistent Disk** mounted at `/opt/render/project/src/whatsapp-bridge/wweb-session` so the WhatsApp session survives restarts (otherwise you must rescan the QR after each deploy/sleep cycle).

### Why this fixes the error

- **Before:** `postinstall` wrote Chrome to `/opt/render/.cache/puppeteer` (Render's default). At runtime Render's process can't see it (different layer / wiped between build and run on some plans). Puppeteer crashes with "Could not find Chrome".
- **After:** Both build and runtime use `./.puppeteer-cache` inside the project source tree, which Render preserves end-to-end. `server.js` sets `PUPPETEER_CACHE_DIR` programmatically as a safety net even if the env var is missing.

### Files to change
- `whatsapp-bridge/package.json` — update `postinstall` script
- `whatsapp-bridge/server.js` — set `PUPPETEER_CACHE_DIR` at startup
- `whatsapp-bridge/.gitignore` — new
- `whatsapp-bridge/README.md` — add Render-without-Docker deploy steps

Then on Render: clear build cache → redeploy. Logs should show `[wweb] QR generated` instead of the Chrome-not-found error.

