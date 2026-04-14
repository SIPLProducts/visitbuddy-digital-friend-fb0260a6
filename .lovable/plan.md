

# Replace Resend with Nodemailer SMTP for Email Sending

## Problem
The current `test-email` edge function uses the Resend API, which has sandbox restrictions. The user has a working nodemailer-based implementation from another project that sends via the user's own SMTP config (e.g. Gmail with App Password).

## Plan

### 1. Rename existing `email_config` table to `smtp_config` schema
Create a migration to:
- Add `is_active` and `plant` columns to the existing `email_config` table (to match the user's schema)
- OR create a new `smtp_config` table and migrate data — but since `email_config` already has the same core fields, we'll **keep `email_config`** and just add `is_active BOOLEAN DEFAULT true` to avoid breaking existing code

Also create two new tables:
- `email_templates` — stores reusable templates with `{{placeholder}}` support
- `email_logs` — audit trail for all sent emails

### 2. Rewrite `test-email` edge function → `test-smtp`
Create `supabase/functions/test-smtp/index.ts` using `npm:nodemailer@6.9.10`:
- Accepts `{ smtp_config_id, to_email }`
- Fetches SMTP credentials from `email_config` table
- Creates nodemailer transporter with `secure: port === 465`, `tls: { rejectUnauthorized: false }`
- Sends test email and returns success/error as JSON (always HTTP 200 to avoid generic errors)

### 3. Create `send-email` edge function
Create `supabase/functions/send-email/index.ts`:
- Accepts `{ template_key, variables }`
- Fetches template from `email_templates`, replaces `{{placeholders}}`
- Fetches active SMTP config, sends via nodemailer
- Logs result to `email_logs`

### 4. Update Settings UI (`src/pages/Settings.tsx`)
- Change `handleTestEmail` to invoke `test-smtp` with `{ smtp_config_id: emailConfig.id, to_email: testEmail }`
- Remove the Resend sandbox warning alert
- Remove references to the old `test-email` function

### 5. Delete old `test-email` edge function
Remove `supabase/functions/test-email/index.ts` after the new function is deployed.

### 6. Update other email-sending functions
Update `send-email-badge`, `send-whatsapp-badge`, etc. to use the new `send-email` function or read from `email_config` with nodemailer instead of Resend, so all email sending goes through the user's configured SMTP.

## Technical details

- **Why nodemailer over denomailer**: `denomailer` uses `Deno.startTls` which is blocked in Supabase Edge Runtime. `npm:nodemailer@6.9.10` works via Deno's npm compatibility.
- **Why `tls: { rejectUnauthorized: false }`**: Supports self-signed certs common in enterprise environments.
- **Why HTTP 200 on errors**: Prevents the Supabase JS client from throwing generic "non-2xx" exceptions; the real error is in JSON body.
- **Gmail setup**: Host `smtp.gmail.com`, port 587, username = full email, password = 16-char App Password.

## Files affected
- `supabase/functions/test-smtp/index.ts` (new)
- `supabase/functions/send-email/index.ts` (new)
- `supabase/functions/test-email/index.ts` (delete)
- `src/pages/Settings.tsx` (update test email call)
- Database migration: add `email_templates`, `email_logs` tables; add `is_active` to `email_config`

