## Plan

1. **Add the missing helper script**
   - Create `deploy/configure-wa-bridge.sh`.
   - It will safely update both on-prem env files:
     - `/home/vmsadm/resl/vvms/config.env`
     - `/home/vmsadm/resl/vvms/backend/supabase/docker/.env`
   - It will generate `WHATSAPP_BRIDGE_API_KEY` automatically if missing.
   - It will set:
     - `WHATSAPP_BRIDGE_API_KEY=<same key in both files>`
     - `WA_HOST_PORT=3001`
     - `WHATSAPP_BRIDGE_URL=http://host.docker.internal:3001`

2. **Fix the WhatsApp bridge Docker build**
   - Update `whatsapp-bridge/Dockerfile` so Docker uses `npm install --omit=dev --ignore-scripts`.
   - This prevents the failing `postinstall` step from trying to run `install-chrome.js` before it exists in the image.

3. **Make the helper complete the recovery flow**
   - Start/rebuild the bridge by calling `deploy/run-wa-bridge.sh`.
   - Recreate the edge-functions container so it picks up the new secrets.
   - Verify the bridge `/health` endpoint.
   - Print the next app steps: Settings → WhatsApp → Connect WhatsApp → scan QR → flip to WhatsApp Web (Demo) → Send test.

4. **Document the command**
   - Add a troubleshooting section for `Bridge call failed — unconfigured`.
   - Include the final command:
     ```bash
     sudo bash deploy/configure-wa-bridge.sh
     ```

After this is implemented and pulled on your server, you’ll run:

```bash
git pull
sudo bash deploy/configure-wa-bridge.sh
```
