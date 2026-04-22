

## Update WhatsApp bridge URL

The `WHATSAPP_BRIDGE_URL` secret (used by the `whatsapp-bridge` edge function to reach your self-hosted whatsapp-web.js bridge) will be updated to:

```
https://2453-2401-4900-977a-b83b-b9fd-e84f-55fc-2e34.ngrok-free.app
```

### What changes
- Update the existing `WHATSAPP_BRIDGE_URL` secret value to the new ngrok URL.
- No code changes — the edge function reads this secret at runtime, so the next QR / status / send / logout call will use the new tunnel automatically.
- `WHATSAPP_BRIDGE_API_KEY` is left untouched and must still match the `BRIDGE_API_KEY` set in your local `whatsapp-bridge/.env`.

### Verification
```text
1. Open Settings → WhatsApp panel and tap "Get QR / Check status".
2. Edge function logs should show host "2453-2401-…ngrok-free.app" and a 200 response.
3. Send a test WhatsApp badge — message arrives via the new bridge.
```

### Out of scope
- No changes to the bridge server code, Twilio settings, or any other secret.
- Reminder: ngrok free URLs change on every restart — when it rotates again, just update this same secret.

