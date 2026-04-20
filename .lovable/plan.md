

User scanned the QR — phone shows "Active" (Linked Devices working), but the app shows status "Unknown" and Send Test stays disabled. So the Lovable UI cannot reach the bridge, even though WhatsApp itself is linked.

Let me think about why "Unknown" specifically:

In `WhatsAppSettingsPanel.refreshOnce`:
- It calls `whatsapp-bridge` edge function with `action: 'qr'`.
- On success it sets `bridgeState = data.state ?? 'unknown'`.
- On error: if message contains `not configured` or `503` → sets `unconfigured = true`. Otherwise → `bridgeState = 'unknown'` and stops polling.

So "Unknown" with **no "bridge server not configured" banner** means: the edge function call **threw** but not with the 503 message. Most likely causes:
1. `WHATSAPP_BRIDGE_URL` secret has a trailing slash or wrong scheme → edge function fetch fails with `Bridge unreachable` (502), supabase-js wraps as a non-2xx error.
2. `WHATSAPP_BRIDGE_API_KEY` mismatch with Render's `BRIDGE_API_KEY` → Render returns 401, proxy forwards it, supabase-js treats non-2xx as error.
3. Render free tier cold start: the first call after sleep can take 30–60 s and time out.
4. CORS / network on the edge function side returning a non-JSON body that fails parsing.

The Lovable edge function logs only show booted/shutdown — no actual invocation log lines visible, suggesting either (a) the panel isn't actually calling it (unlikely — they said they pressed Connect) or (b) we just don't have console.log lines because the proxy only logs on `catch`.

Crucially the user's phone shows "Active" — that proves the Render bridge **did** authenticate. So the bridge is healthy. The break is between the **browser → supabase edge function → Render**.

Plan: don't guess — present a small diagnostic + fix plan that:

1. Adds visible diagnostics so we can see WHY status is "Unknown" instead of swallowing the error.
2. Hardens the edge function to return useful structured errors instead of generic ones.
3. Verifies the two secrets are correct and the URL has no trailing slash.
4. Once cause is identified, status will move to `ready` and Send Test will enable.

Keep concise.

## Plan — Diagnose "Unknown" status & enable Send Test

### Why this is happening
WhatsApp on your phone says "Active" — that proves the Render bridge authenticated successfully. The break is between **browser → Supabase Edge Function (`whatsapp-bridge`) → Render**. Right now any failure on that hop is silently collapsed to `bridgeState = 'unknown'`, which is exactly what you're seeing, and the Send button stays disabled because it requires `state === 'ready'`.

The 3 most likely root causes (in order):
1. `WHATSAPP_BRIDGE_URL` secret has a trailing `/` or wrong scheme.
2. `WHATSAPP_BRIDGE_API_KEY` (Lovable secret) ≠ `BRIDGE_API_KEY` (Render env var).
3. Render free-tier cold start — first call after sleep can take 30–60 s and the supabase-js client times out before the bridge wakes.

### What I'll change

1. **Surface the real error in the UI** (`src/components/settings/WhatsAppSettingsPanel.tsx`)
   - Stop swallowing `catch` into "unknown".
   - Show the actual error (status code + message + bridge URL host) in a small "Last error" line under the status badge.
   - Add a "Diagnostics" expandable showing: HTTP status, raw response body, and which classification (`unconfigured` / `unauthorized` / `unreachable` / `timeout` / `ok-but-not-ready`).

2. **Return structured errors from the proxy** (`supabase/functions/whatsapp-bridge/index.ts`)
   - Include `upstreamStatus`, `upstreamUrl`, and `upstreamBody` (truncated) in error responses so the UI can show them.
   - Add a 60 s fetch timeout with a clear `timeout` error code (not a generic 502).
   - Log every action + outcome so the Edge Function logs are useful (right now they only show boot/shutdown).

3. **Add a "Wake bridge" button**
   - Hits `whatsapp-bridge` with `action: 'status'` and waits up to 60 s, showing a spinner. This handles Render cold starts cleanly.

4. **Pre-flight checklist banner** (only shows when status ≠ ready)
   - Verifies the two secrets are present (`WHATSAPP_BRIDGE_URL`, `WHATSAPP_BRIDGE_API_KEY`).
   - Warns if `WHATSAPP_BRIDGE_URL` ends with `/` (we already strip it server-side, but the warning helps the user fix it once).

### Verification I'll do after deploy
- Curl `whatsapp-bridge` with `action: 'status'` from sandbox and confirm the structured response.
- Read the new edge function logs to see exactly what Render is returning.
- Report back the exact failure code so you only need one secret fix instead of guessing.

### Files to change
- `src/components/settings/WhatsAppSettingsPanel.tsx` — surface errors, add Wake/Diagnostics UI.
- `supabase/functions/whatsapp-bridge/index.ts` — structured errors, timeout, logging.

### Files unchanged
- Render `server.js`, DB schema, all other edge functions.

### After deploy — what you should do
1. Open Settings → WhatsApp.
2. Click **Wake bridge** (handles Render cold start).
3. If it still says "Unknown", the Diagnostics panel will tell us **exactly** which of the 3 causes it is — we fix that one secret/URL and Send Test will enable on the next refresh.

