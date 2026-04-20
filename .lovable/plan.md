

## What’s causing the new error

There are now 2 separate issues in your log:

1. **Node version mismatch**
   - The bridge requires **Node 20.x**
   - Your laptop is running **Node 18.20.8**
   - This may still install, but `whatsapp-web.js` / Puppeteer are much more reliable on Node 20

2. **Windows absolute path bug in the postinstall script**
   - The current script is:
     ```json
     cross-env PUPPETEER_CACHE_DIR=./.puppeteer-cache npx puppeteer browsers install chrome
     ```
   - On Windows, Puppeteer’s installer is rejecting that relative path with:
     `Error: Target directory is expected to be absolute`

There is also a likely follow-up issue after install:
3. **Windows Chrome auto-detection is incomplete in `server.js`**
   - The bridge currently detects Linux and Mac Chrome paths
   - It does **not** include the Windows Chrome executable path, so even after install it may fail to launch Chrome on Windows unless we add that path

## Plan

### 1) Fix the install script for Windows + Mac + Linux
Update `whatsapp-bridge/package.json` so `postinstall` passes an **absolute** cache directory instead of `./.puppeteer-cache`.

Recommended approach:
- keep `cross-env`
- replace the script with a small Node helper that resolves the full absolute path before calling Puppeteer

This keeps the setup cross-platform and avoids breaking Render/Linux.

### 2) Add Windows Chrome detection in the bridge
Update `whatsapp-bridge/server.js` so `findInstalledChrome()` also checks Windows Chrome-for-Testing locations, such as the `.exe` path under the downloaded Chrome folder.

That way:
- local Windows install works
- `PUPPETEER_EXECUTABLE_PATH` is auto-filled correctly
- `node server.js` can start without extra manual config

### 3) Update setup docs
Adjust `whatsapp-bridge/README.md` so the local Windows instructions match the new install flow and clearly say:
- use **Node 20**
- `.env` goes in `whatsapp-bridge/.env`
- `npm install` should now succeed on Windows
- then run `node server.js`
- then `ngrok http 3000`

## Files to change

- `whatsapp-bridge/package.json`
- `whatsapp-bridge/server.js`
- `whatsapp-bridge/README.md`

## Expected result after implementation

On your laptop, this flow should work:

```text
1. Install Node 20
2. cd whatsapp-bridge
3. npm install
4. node server.js
5. ngrok http 3000
6. update WHATSAPP_BRIDGE_URL + WHATSAPP_BRIDGE_API_KEY
7. scan QR in the app
```

And the bridge should:
- install Chrome successfully
- detect the Windows Chrome binary
- start normally
- let the app show the bridge as connected instead of stuck/unknown

## Technical details

Current confirmed code state:
- `package.json` uses `cross-env PUPPETEER_CACHE_DIR=./.puppeteer-cache ...`
- `server.js` sets `PUPPETEER_CACHE_DIR` to an absolute path at runtime, but that happens **after install**, so it does not help `npm install`
- `server.js` currently only checks Linux/Mac executable locations in `findInstalledChrome()`
- `.env` loading is already correctly enabled via:
  ```js
  import 'dotenv/config';
  ```

