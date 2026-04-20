

## Status

Secrets verified in project:
- `WHATSAPP_BRIDGE_URL` ✓
- `WHATSAPP_BRIDGE_API_KEY` ✓

The `whatsapp-bridge` edge function will pick these up automatically on next invocation. No deploy or code change required.

## What to do now (test end-to-end)

1. Sign in to the app and open **Settings → WhatsApp** tab.
2. The status badge should briefly show "Disconnected" / "Unknown", then update once it reaches your Render bridge.
3. Click **Connect WhatsApp**. The panel will poll the bridge every 3 seconds and display a QR code.
   - Note: Render free tier sleeps after inactivity. The first request may take 30–60 seconds to wake the server. If the QR doesn't appear in ~10 seconds, click **Refresh status** once or twice.
4. On your demo phone, open WhatsApp → **Settings → Linked Devices → Link a Device** → scan the QR.
5. Status badge flips to **Connected**.
6. Flip the provider toggle to **WhatsApp Web (Demo)**.
7. Approve a test visitor (with a valid phone number on WhatsApp). The approval message + check-in QR should arrive from your scanned number within seconds.
8. After the demo, flip the toggle back to **Twilio (Production)**.

## If something fails

- **"Bridge server not configured" banner** → secrets weren't picked up; hard-refresh the app and retry.
- **QR never appears / "Bridge unreachable"** → Render service is asleep or crashed. Open `https://whatsapp-integration-vvms.onrender.com/status` in a browser to wake/check it; check Render logs.
- **Message not delivered after approval** → check Edge Function logs for `approve-visitor` and `whatsapp-bridge`. The approval flow falls back to Twilio automatically if the bridge fails, so the visitor still gets the badge.

No plan to implement — this is a verification step. Tell me what you see after testing and I'll debug from there.

