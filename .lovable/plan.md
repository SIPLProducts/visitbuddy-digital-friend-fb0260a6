
## Diagnosis

The bridge code already includes the browser download step in `whatsapp-bridge/package.json`:

- `puppeteer` dependency is present
- `postinstall: npx puppeteer browsers install chrome` is present

But your Render log still says Chrome is being searched in:

```text
/opt/render/.cache/puppeteer
```

That means the missing piece is most likely **Render configuration**, not app code:
- either `PUPPETEER_CACHE_DIR` was not added
- or it was added after the last deploy but the build cache was not cleared
- or the service is still not building from the `whatsapp-bridge/` folder you updated

## Plan

1. **Verify Render service settings**
   - Confirm the service is using the `whatsapp-bridge` folder as its root.
   - Confirm this env var exists exactly:
     - `PUPPETEER_CACHE_DIR=/opt/render/project/src/.cache/puppeteer`

2. **Force a clean rebuild**
   - In Render, run **Manual Deploy → Clear build cache & deploy**
   - This is important because the Chrome download happens during build, not at runtime.

3. **Use the log to confirm whether the fix applied**
   - After redeploy, if the error still mentions:
     ```text
     /opt/render/.cache/puppeteer
     ```
     then Render did **not** pick up the env var.
   - If the cache path changes to:
     ```text
     /opt/render/project/src/.cache/puppeteer
     ```
     then the env var is applied and we only need to confirm Chrome actually downloaded during build.

4. **Check build logs, not just runtime logs**
   - Look for a browser download step during build, such as Chromium/Chrome being installed by Puppeteer.
   - If there is no browser download in the build logs, the postinstall script is not running from the updated package.

5. **Fallback if Node service keeps failing**
   - Switch the Render service to a **Docker-based deploy** using the existing `whatsapp-bridge/Dockerfile`.
   - That path is more reliable because Chromium is installed in the container image instead of relying on Render cache behavior.

## Expected outcome after the correct redeploy

When fixed, the next startup should no longer show “Could not find Chrome”.
Then:
- `/status` should stop returning `disconnected`
- clicking **Connect WhatsApp** in Settings should produce a QR within a few seconds

## Technical notes

Current codebase state:
- `whatsapp-bridge/package.json` already has the needed `postinstall`
- `whatsapp-bridge/server.js` is fine for QR generation once Chrome exists
- the failure is happening before WhatsApp can initialize

So the most likely next action is:
```text
Set/verify PUPPETEER_CACHE_DIR on Render → Clear build cache & deploy
```

If you want, the next implementation step I would take after approval is to harden the bridge for hosting by:
- logging the effective browser/cache paths on startup
- documenting the exact Render setup in the bridge README
- adding a Docker-first fallback deployment note
