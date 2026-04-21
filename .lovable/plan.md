

## Update WhatsApp bridge ngrok URL

Replace the `WHATSAPP_BRIDGE_URL` secret value with the new ngrok host so the `whatsapp-bridge` Edge Function points at the freshly tunnelled whatsapp-web.js server.

### What changes

1. Update the project secret **`WHATSAPP_BRIDGE_URL`** to:
   ```
   https://b328-2401-4900-9792-1e8b-1da6-2f6b-bf18-5f30.ngrok-free.app
   ```
   - No trailing slash (the Edge Function strips one if present, but cleaner without).
   - Keep `WHATSAPP_BRIDGE_API_KEY` unchanged — must still match the Render/local bridge's `BRIDGE_API_KEY`.

2. **No code changes.** `supabase/functions/whatsapp-bridge/index.ts` reads `Deno.env.get("WHATSAPP_BRIDGE_URL")` on every invocation, so the new URL takes effect on the next call.

3. **No ANPR camera changes.** `gates.camera_url` rows are not touched.

### Verification

```text
1. Settings → WhatsApp tab → click "Wake bridge".
   → Status moves to "Connected" or "Awaiting Scan" (cold start may take ~30–60 s).
2. If "Awaiting Scan", scan the QR with WhatsApp → Linked Devices.
   → Status flips to "Connected".
3. Send a test message from the panel → recipient receives it.
4. Approve a visitor with provider set to "WhatsApp Web (Demo)".
   → Visitor gets the approval message from the scanned number.
```

### Out of scope
- ANPR camera ngrok URL (`gates.camera_url`).
- `WHATSAPP_BRIDGE_API_KEY` rotation.
- Bridge code or deployment changes.

