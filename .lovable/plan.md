

## Fix — `spawnSync EINVAL` on Windows when running `npx.cmd`

### Root cause
On Windows, Node 20's `spawnSync` refuses to run `.cmd` files unless `shell: true` is set. The current `install-chrome.js` passes `shell: false`, so `npx.cmd` fails immediately with `EINVAL`. Chrome never downloads, no QR appears.

### Fix
Update `whatsapp-bridge/install-chrome.js` so the spawn call works on Windows:
- On Windows: use `shell: true` and run the bare command `npx puppeteer browsers install chrome` (the shell resolves `npx` → `npx.cmd` correctly).
- On macOS/Linux: keep `shell: false` and `cmd = 'npx'` as-is.
- Add a clearer log line on success showing where Chrome was installed.

That's the only code change needed. `server.js` already auto-detects the binary under `.puppeteer-cache\chrome\win64-...\chrome-win64\chrome.exe` once it exists.

### Files to change
- **Edit** `whatsapp-bridge/install-chrome.js` — switch to `shell: true` on Windows so `npx.cmd` is invocable.

### What you'll do after I apply the fix

```text
1. cd C:\Users\HP\visitbuddy-digital-friend-fb0260a6\whatsapp-bridge
2. node install-chrome.js
   → expect "Downloading Chrome 131.0.6778.x..." then "chrome@131... C:\...\chrome.exe"
   → takes 1–3 minutes, ~150 MB
3. dir .puppeteer-cache\chrome      ← confirm a win64-* folder exists
4. node run.js
   → boot log should now include:
     [wweb-bridge] detected Chrome at C:\...\chrome.exe
     [wweb] QR generated, scan with WhatsApp app.
5. Refresh Settings → WhatsApp tab in Lovable → click Refresh status
6. Phone → WhatsApp → Linked Devices → Unlink old "active" device → Link new device → scan QR
7. Status flips to Connected → click Send Test Message → message arrives
8. Approve a real visitor → badge sent via your WhatsApp number
```

### Fallback if `node install-chrome.js` still fails after the fix

Run this single one-liner from the `whatsapp-bridge` folder (uses the local `puppeteer` package directly, bypassing `npx` entirely):

```cmd
node -e "process.env.PUPPETEER_CACHE_DIR=require('path').resolve('.puppeteer-cache'); require('puppeteer/lib/cjs/puppeteer/node/cli.js')" install --browser chrome
```

If that also fails (firewall / proxy), I'll guide a manual download from `https://googlechromelabs.github.io/chrome-for-testing/` with the exact unzip path.

### Out of scope
- ngrok URL stability, Twilio fallback, deploying the bridge to Render — separate steps.

