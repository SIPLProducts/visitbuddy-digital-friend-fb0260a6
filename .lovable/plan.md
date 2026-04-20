

## Route visitor-creation WhatsApp through your Web bridge (parity with email)

### What you're getting
Today, when a visitor is created:
- **Email** to host (with Approve/Reject buttons) ✅ working
- **Email** to visitor (status: awaiting approval) ✅ working
- **WhatsApp** to host + visitor — sent, but **only via Twilio** (sandbox, expiring URLs, paid)

After this fix, those same two WhatsApp messages will be sent through your **WhatsApp Web bridge** (your own number, free, no sandbox opt-in) whenever Settings → WhatsApp Provider = `WhatsApp Web`. Twilio remains the automatic fallback if the bridge is offline.

### What changes

**File: `supabase/functions/notify-host/index.ts`** — add the same provider-aware sending block that `approve-visitor` already uses.

1. Read `whatsapp_provider` from `tenant_settings` at the top of the handler (defaults to `twilio`).
2. Add a small helper `sendViaBridge(phone, message, mediaUrl?)` that POSTs to `${WHATSAPP_BRIDGE_URL}/send` with the `x-api-key` header — exactly like `approve-visitor`.
3. **Host message**: if provider is `whatsapp_web`, try the bridge first. If the bridge call fails (or secrets missing), fall back to the existing Twilio path. Bridge sends the same text body and includes `mediaUrl = visitor.photo_url` when present.
4. **Visitor confirmation message**: same pattern — bridge first when provider is `whatsapp_web`, else Twilio.
5. The Twilio block stays untouched — it just becomes the fallback rather than the only path.
6. Approve/Reject links inside the host WhatsApp message stay identical (they're plain URLs to `/approve-visitor` — they work over either transport).
7. Add provider tag (`'twilio' | 'whatsapp_web'`) to the response JSON so the UI can show which transport actually delivered.

No template changes, no new tables, no new secrets — `WHATSAPP_BRIDGE_URL` and `WHATSAPP_BRIDGE_API_KEY` are already configured.

### Behaviour matrix after the change

| Provider setting | Bridge running? | Host phone present | What sends |
|---|---|---|---|
| `whatsapp_web` | ✅ yes | ✅ | **Bridge** (your number) |
| `whatsapp_web` | ❌ no | ✅ | Falls back to **Twilio** |
| `twilio` | — | ✅ | **Twilio** (unchanged) |
| any | — | ❌ no phone | Skipped (email still sends) |

Same matrix applies to the visitor confirmation message.

### Files touched
- **Edit** `supabase/functions/notify-host/index.ts` — provider switch + bridge helper + bridge-first send for both host and visitor messages.

### What you'll do after I apply the fix

```text
1. Make sure your bridge is still running:
   - Terminal shows: [wweb] ready — sending enabled
   - Settings → WhatsApp shows: Connected (green)
2. Settings → WhatsApp tab → confirm "Provider" is set to WhatsApp Web (not Twilio).
3. Create a new visitor with:
   - a host that has a phone number on their employee record
   - a visitor phone number
   - a visitor email (so you can compare email vs WhatsApp content)
4. Within ~5 seconds expect:
   - Host's phone: WhatsApp from YOUR number with Approve/Reject links + visitor photo
   - Visitor's phone: WhatsApp confirmation with their visitor ID
   - Host's inbox: same email as before (unchanged)
   - Visitor's inbox: same email as before (unchanged)
5. Tap Approve in the WhatsApp message → status flips to scheduled →
   approve-visitor sends the approved badge over the bridge too (already wired).
```

### Out of scope
- Self-service portal already calls `notify-host`, so it gets the upgrade for free — no extra work.
- Vehicle WhatsApp (`send-vehicle-whatsapp`) — separate function, not part of this request.
- Render deployment / ngrok stable URL — separate task.

