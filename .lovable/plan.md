

## Hardcode red header in remaining email functions

Update the two remaining email-generating edge functions so the "Re Sustainability" header renders red (`#dc2626`) everywhere, matching the already-fixed `send-email` / `send-email-badge` / Safety Permit badge.

### Files to edit

- `supabase/functions/notify-host/index.ts` — inside `brandedHeader(...)`, change the company-name `<div>` from `color:${b.primaryColor}` to `color:#dc2626`.
- `supabase/functions/approve-visitor/index.ts` — same change inside its `brandedHeader(...)`.

No other styling changes. `branding.primaryColor` continues to be read so future accents (buttons, borders) can still use the tenant value — only the title is locked to red.

### Deploy

Redeploy both functions after the edit:
- `notify-host`
- `approve-visitor`

### Coverage after fix

| Email | Function | Header red? |
|---|---|---|
| Host approval request | `notify-host` | ✅ after this fix |
| Visitor "request submitted" | `notify-host` | ✅ after this fix |
| Visitor approval + check-in QR | `approve-visitor` | ✅ after this fix |
| Visitor checkout QR | `send-email-badge` | ✅ already |
| Generic/test emails | `send-email` | ✅ already |

### Verification

```text
1. Create a new visitor with phone + email.
   → Host email: "Re Sustainability" header in red.
   → Visitor "Request Submitted" email: red header.

2. Tap Approve from host WhatsApp/email.
   → Visitor "Visit Approved" email with check-in QR: red header.

3. Check the visitor in.
   → Visitor "Checked In" email with checkout QR: red header (unchanged).
```

### Out of scope

- WhatsApp / SMS templates (text only, no color).
- `tenant_settings.primary_color` — left untouched; still drives non-header accents.
- Safety Permit printed badge — already red.

