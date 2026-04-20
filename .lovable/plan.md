

User wants to revert email sending back to SMTP (nodemailer with app password) instead of whatever was changed. Let me check the current state of email functions.

Looking at the current code:
- `supabase/functions/send-email/index.ts` — uses **Resend API** (`https://api.resend.com/emails` with `RESEND_API_KEY`)
- `supabase/functions/approve-visitor/index.ts` — already uses SMTP via nodemailer (good)
- Other email functions likely exist: `send-email-badge`, `notify-host`, `test-email`, `test-smtp`

The user wants `send-email` reverted to SMTP with app password (Gmail/generic SMTP via `email_config` table). The pattern already exists in `approve-visitor` — uses `email_config` table + `nodemailer`.

Memory confirms: SMTP config is stored in `public.email_config` table, Gmail requires 16-char App Password, nodemailer is the established strategy.

## Plan

Rewrite `supabase/functions/send-email/index.ts` to send via SMTP using nodemailer + the `email_config` table (same pattern as `approve-visitor`), instead of Resend.

### Changes

**File: `supabase/functions/send-email/index.ts`**

Keep:
- Same input contract: `{ template_key, variables }`
- Template fetch from `email_templates` table
- Placeholder replacement `{{var}}`
- HTML wrapper (`generateHtmlEmail`)
- Logging to `email_logs`

Replace:
- Remove Resend API call
- Add `import nodemailer from "npm:nodemailer@6.9.10"`
- Fetch active row from `email_config` table (`smtp_host`, `smtp_port`, `smtp_username`, `smtp_password`, `sender_email`, `sender_name`)
- Build transporter: `secure: smtp_port === 465`, `tls: { rejectUnauthorized: false }` (matches `approve-visitor`)
- Send via `transporter.sendMail({ from, to, cc, subject, html })`
- On no SMTP config → log status `"logged"` (graceful, same as today)
- On send failure → log status `"failed"` and return success:false
- On success → log status `"sent"`

### What stays the same
- All callers continue to invoke `send-email` with `{ template_key, variables }` — no client changes needed.
- `email_templates` and `email_logs` schemas unchanged.
- CORS, error handling, response shape unchanged.

### Notes
- `RESEND_API_KEY` secret can stay (harmless, used by no other code path after this revert). No need to remove.
- User must ensure SMTP config row exists in **Settings → SMTP** with `is_active = true` and a valid Gmail App Password (16 chars, no spaces).
- Function is already in `supabase/config.toml` (no entry needed; default deploy is fine). No config change required.

### Files to change
- `supabase/functions/send-email/index.ts` — swap Resend → nodemailer SMTP

That's it — single-file change, no DB migration, no client changes.

