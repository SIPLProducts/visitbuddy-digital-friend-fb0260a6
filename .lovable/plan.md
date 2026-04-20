

User hit the Windows-specific bug: `postinstall` script uses Unix syntax `PUPPETEER_CACHE_DIR="$(pwd)/.puppeteer-cache"` which `cmd.exe` can't parse. Stack-overflow context confirms the fix exactly.

Best solution: use `cross-env` (cross-platform, works on Windows + Mac + Linux + Render). Just `set VAR=...` would break Render's Linux build. `cross-env` solves both.

Plan: tiny 2-line change.

## Plan — Fix Windows `npm install` failure

### Why it's breaking
The `postinstall` script in `whatsapp-bridge/package.json` uses Unix shell syntax (`PUPPETEER_CACHE_DIR="$(pwd)/..."`) which Windows `cmd.exe` doesn't understand. It works on Mac/Linux/Render but not on your Windows laptop.

### Fix — use `cross-env` (works everywhere)
Switching to plain Windows `set` syntax would break the Render deploy. `cross-env` is the standard fix and works on Windows + Mac + Linux + Render with one command.

### Files to change
**`whatsapp-bridge/package.json`** — 2 changes:
1. Add `cross-env` to `devDependencies`.
2. Rewrite `postinstall` script:
   ```json
   "postinstall": "cross-env PUPPETEER_CACHE_DIR=./.puppeteer-cache npx puppeteer browsers install chrome"
   ```
   (Drops `$(pwd)` — `server.js` already resolves `./.puppeteer-cache` to an absolute path on boot.)

### What you'll do after
In `C:\Users\HP\visitbuddy-digital-friend-fb0260a6\whatsapp-bridge`:
```bash
npm install
```
Chromium downloads to `.\.puppeteer-cache\` (~170 MB, ~1 min). Then:
```bash
node server.js
```
You should see `[wweb] QR generated, scan with WhatsApp app.` — proceed with Step 4 (ngrok) of the earlier setup.

### Files unchanged
- `server.js`, `.env.example`, README, edge functions, app code.

### Out of scope
Fixing the deprecation warnings (`inflight`, `rimraf`, `glob`, `puppeteer 23.x`) — those are upstream and don't block the install.

