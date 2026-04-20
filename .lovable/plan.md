

## Fix — Chrome target closes immediately on Windows

### What's happening
Chrome is found and launched, but the browser process closes within milliseconds — before whatsapp-web.js can attach. Puppeteer reports `Target.setAutoAttach: Target closed`. This is a known incompatibility between:

- Puppeteer 23 (your top-level dependency) — uses the **new headless mode** by default
- The older `puppeteer-core` bundled inside `whatsapp-web.js@1.26` — expects the **legacy headless shell**
- Windows Chrome 131 — the new headless mode is fragile here, especially with `--disable-gpu` + `--no-sandbox` combined

It's not antivirus, not the path, not the binary — it's a launch-flag mismatch.

### The fix (server-side, one file)

Change the `puppeteer` block in `whatsapp-bridge/server.js` to:

1. Switch `headless: true` → `headless: 'shell'` (the legacy headless that whatsapp-web.js was built against).
2. Drop `--disable-gpu` on Windows (causes the early target-close in headless shell mode).
3. Add `--disable-features=Translate,BackForwardCache,AcceptCHFrame` and `--no-first-run --no-default-browser-check` — the standard set whatsapp-web.js maintainers recommend.
4. Add a `timeout: 60000` to the puppeteer launch so slow Windows boots don't false-fail.
5. Keep the `executablePath` you already auto-detect.

That single edit is what unblocks the bridge.

### Files to change

- **Edit** `whatsapp-bridge/server.js` — update the `puppeteer:` config block inside `buildClient()` (lines ~125–142). No other code touched.

### What you'll do after I apply the fix

```text
1. In the cmd window where node run.js is running, press Ctrl+C
2. node run.js
3. Boot log should now reach (instead of TargetCloseError):
   [wweb-bridge] detected Chrome at C:\...\chrome.exe
   [wweb-bridge] listening on :3000
   [wweb] QR generated, scan with WhatsApp app.
4. A small Chrome window may briefly flash on your taskbar — that's normal in 'shell' mode.
5. Refresh Settings → WhatsApp tab in Lovable → click Refresh status
6. Phone → WhatsApp → Linked Devices → Unlink any old "active" device → Link new device → scan QR
7. Status flips to Connected → Send Test Message → WhatsApp arrives on your phone
```

### Fallback if `headless: 'shell'` still fails

If you still see `TargetCloseError` after the change, the next step is downgrading puppeteer to `^21.11.0` (the version whatsapp-web.js@1.26 was actually tested against). That's a `package.json` edit + `rm -rf node_modules && npm install` — I'll guide it as a follow-up only if needed.

### Out of scope
- Twilio fallback, Render deployment, ngrok stable URL — separate tasks.

