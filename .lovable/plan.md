

# Email Notifications for Visitor Approval Workflow (Using Configured SMTP)

## Overview
Add three automated emails using the SMTP configuration from the Settings page (`email_config` table) and `nodemailer`, matching the pattern already used in `send-email` Edge Function.

## Three Emails

1. **To Host** (on visitor submission) — "You have a visitor pending approval, click to approve/reject"
2. **To Visitor** (on visitor submission) — "Your visit request has been sent for approval"
3. **To Visitor** (on host approval) — "Your visit is approved, show this to the security guard"

## Changes

### 1. `supabase/functions/notify-host/index.ts`
- Add `import nodemailer from "npm:nodemailer@6.9.10"`
- After WhatsApp notifications, add an inline `sendSmtpEmail` helper that:
  - Fetches active SMTP config from `email_config` table (same pattern as `send-email`)
  - Creates nodemailer transport
  - Sends the email using `sender_email` / `sender_name` from config
- **Email to Host** (`hostData.email`): HTML email with visitor details + "Approve" / "Reject" buttons linking to `/approve-visitor?id=...&action=approve|reject`. Subject: "Visitor Approval Required — [Visitor Name]"
- **Email to Visitor** (`visitor.email` from visitors table — need to add `email` to the select query): HTML email confirming request submitted, mentioning host name, and "You will be notified once approved". Subject: "Visit Request Submitted — Awaiting Approval"
- Log both emails to `email_logs` table
- Both emails are best-effort (failures logged but don't block the response)

### 2. `supabase/functions/approve-visitor/index.ts`
- Add `import nodemailer from "npm:nodemailer@6.9.10"`
- After status update to `scheduled`, add same `sendSmtpEmail` helper
- **Email to Visitor** (`visitor.email`): HTML email with badge details, QR code image, and bold text "Please show this email to the security guard at the entrance". Subject: "Visit Approved — Please Show This to Security"
- Log to `email_logs` table
- Best-effort (failure doesn't block approval response)

### 3. Update visitor select query in `notify-host`
- Add `email` field to the visitor select: currently fetches `id, visitor_id, name, phone, company, purpose, photo_url, host_id, department_id, gate_id, status` — need to add `email`

## Technical Details
- All emails use the SMTP config from `email_config` table (host, port, username, password, sender_email, sender_name) — the same settings configured on the Settings page
- Uses `nodemailer` via `npm:nodemailer@6.9.10` (same as existing `send-email` function)
- RLS on `email_config` allows authenticated SELECT; edge functions use service role key so no issue
- `email_logs` INSERT policy allows authenticated; service role bypasses RLS

## Files Changed
- `supabase/functions/notify-host/index.ts` — Add email to host + email to visitor on submission
- `supabase/functions/approve-visitor/index.ts` — Add email to visitor on approval

No database migrations needed.

