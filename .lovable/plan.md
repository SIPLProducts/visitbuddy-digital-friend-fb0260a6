

## Update WhatsApp bridge URL

The `WHATSAPP_BRIDGE_URL` runtime secret (used by the `whatsapp-bridge` edge function to reach your self-hosted whatsapp-web.js bridge) will be updated to:

```
https://392a-2401-4900-97a1-115f-ac1c-dfdb-498f-2444.ngrok-free.app
```

### What changes
- Overwrite the existing `WHATSAPP_BRIDGE_URL` secret with the new ngrok tunnel URL.
- No code or database changes — the edge function reads this secret at runtime, so the next QR/status/send/logout call will use the new tunnel automatically.
- `WHATSAPP_BRIDGE_API_KEY` is left untouched and must still match the `BRIDGE_API_KEY` configured in your local `whatsapp-bridge/.env`.

### Verification
```text
1. Open Settings → WhatsApp panel and tap "Get QR / Check status".
2. Edge function logs should show host "392a-…ngrok-free.app" and a 200 response.
3. Send a test WhatsApp badge — message should arrive via the new bridge.
```

### Out of scope
- No changes to bridge server code, Twilio settings, or other secrets.
- Reminder: free ngrok URLs rotate on restart — update this same secret again when the tunnel changes.
