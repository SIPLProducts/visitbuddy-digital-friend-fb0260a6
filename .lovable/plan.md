

The user wants to completely remove the Resend concept and revert to the previously working SMTP-only configuration. Let me identify all Resend references.

From earlier exploration:
1. `supabase/functions/test-smtp/index.ts` — uses Resend
2. `supabase/functions/send-email-badge/index.ts` — uses Resend
3. `src/pages/Settings.tsx` — has Resend banner + duplicate test button
4. `supabase/functions/send-email/index.ts` — already reverted to SMTP ✓

Need to verify Settings.tsx state and check for any other Resend mentions.

## Plan

Fully purge Resend from the project, restoring the original SMTP-only flow (nodemailer + `email_config` table app password).

### Files to change

**1. `supabase/functions/test-smtp/index.ts`** — rewrite to SMTP
- Remove `Resend` import.
- Use `nodemailer` (same pattern as `approve-visitor` and `send-email`).
- Fetch active row from `email_config` (host, port, username, password, sender_email, sender_name).
- If no active config → `{ error: "No active SMTP configuration found. Configure SMTP in Settings → Email." }`.
- Build transporter with `secure: smtp_port === 465`, `tls: { rejectUnauthorized: false }`.
- Send the existing "Configuration Verified" HTML, replacing `Provider: Resend` with `Provider: SMTP (<host>:<port>)`.
- Return clean error messages on SMTP failure (helps with Gmail App Password issues).

**2. `supabase/functions/send-email-badge/index.ts`** — rewrite to SMTP
- Remove `Resend` import.
- Use `nodemailer` + `email_config`.
- Keep the existing badge HTML, request shape `{ email, visitorName, visitorId, ... }` — no caller changes.
- If no active SMTP config → `{ error: "Email service not configured. Configure SMTP in Settings → Email." }`.

**3. `src/pages/Settings.tsx`** — purge Resend UI
- Remove the green **"PRIMARY: Email sending via Resend"** banner.
- Remove the duplicate "Send test email via Resend" button at the top.
- Remove the resend.com/domains link and the SPF/DKIM/DMARC paragraph.
- Remove the "Custom SMTP (fallback)" subtitle — rename section to "SMTP Configuration".
- Add a small note: "Gmail requires a 16-character App Password (not your regular password)."
- Keep the existing **"Send Test Email"** button at the bottom of the SMTP form (unchanged — it already calls `test-smtp`).

### What stays untouched
- `email_config`, `email_templates`, `email_logs` table schemas — no migration.
- `supabase.functions.invoke('test-smtp', { body: { to_email } })` signature — no client API change.
- `send-email-badge` request/response shape — no caller changes.
- `RESEND_API_KEY` secret stays in storage (harmless and unreferenced after this; user can remove later if desired).

### Deploy
After file edits, redeploy `test-smtp` and `send-email-badge` so the new SMTP code is live.

### Files to change
- `supabase/functions/test-smtp/index.ts` — Resend → nodemailer SMTP
- `supabase/functions/send-email-badge/index.ts` — Resend → nodemailer SMTP
- `src/pages/Settings.tsx` — remove all Resend UI
- Redeploy: `test-smtp`, `send-email-badge`

After deploy: open **Settings → Email**, click **Send Test Email** → email sends through your Gmail SMTP + App Password, exactly like before.

