## Update WhatsApp Bridge URL Secret

Update the runtime secret `WHATSAPP_BRIDGE_URL` to the new ngrok tunnel so the `whatsapp-bridge` edge function routes requests to the correct host.

### Changes
- Replace `WHATSAPP_BRIDGE_URL` with `https://64fd-2401-4900-5080-5fb0-3cfd-45b5-8377-7908.ngrok-free.app`.
- No code or database changes — the edge function reads this secret at runtime.

### Verification
1. Open **Settings → WhatsApp** and tap **Get QR / Check status**.
2. Confirm the edge function log shows the new host and returns HTTP 200.
3. Send a test WhatsApp badge to verify delivery through the new tunnel.

### Notes
- `WHATSAPP_BRIDGE_API_KEY` stays unchanged; it must still match the bridge server's `BRIDGE_API_KEY`.
- Free ngrok URLs rotate on restart — update this same secret again whenever the tunnel changes.
