

## Update WhatsApp Bridge URL Secret

Update the runtime secret `WHATSAPP_BRIDGE_URL` to the new ngrok tunnel so the `whatsapp-bridge` edge function routes requests correctly.

### Changes
- Replace `WHATSAPP_BRIDGE_URL` with `https://8293-2401-4900-9797-3842-b1ed-4190-679e-3be3.ngrok-free.app`.
- No code or database changes — the edge function reads this secret at runtime.

### Verification
1. Open **Settings → WhatsApp** and tap **Get QR / Check status**.
2. Confirm the edge function log shows the new host and returns HTTP 200.
3. Send a test WhatsApp badge to verify delivery through the new tunnel.

### Notes
- `WHATSAPP_BRIDGE_API_KEY` is left untouched; it must still match the bridge server's `BRIDGE_API_KEY`.
- Free ngrok URLs rotate on restart — update this same secret again when the tunnel changes.

