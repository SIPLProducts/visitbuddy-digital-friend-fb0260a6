

## The real situation (now fully clear)

- **Sender address required:** `visitor@resustainability.com` (client's mailbox on client's domain)
- **Sending app:** VisiGuard on `visiguard.sharvisoftwareservices.com` (our domain)
- **Client's IT request:** "Give us the DNS TXT records (SPF/DKIM/DMARC) so we can publish them on **resustainability.com**, authorizing your app to send mail as `@resustainability.com`."

This is **third-party domain authentication**: the client publishes records on *their* domain that name *our* sending infrastructure as authorized. No DNS access to either domain is needed from us — we just need an email service that can generate domain-specific SPF/DKIM/DMARC records for `resustainability.com`.

Gmail SMTP cannot do this (records would belong to Google, not to `resustainability.com`). We need to switch to **Resend**, which lets us add `resustainability.com` as a sending domain and produces the exact records the client must publish.

## Why Resend (not Lovable Email)

Lovable Email delegates a *subdomain* of *our* domain to Lovable's nameservers. It cannot host a sending identity on the client's domain (`resustainability.com`) — the client would have to delegate NS to Lovable, which they will not do for a single mailbox.

**Resend** supports adding `resustainability.com` directly: it generates SPF (TXT), DKIM (3 CNAMEs), and optional DMARC (TXT) records. The client's IT team publishes them on `resustainability.com`. Once verified, we send `From: visitor@resustainability.com` via Resend's API. `RESEND_API_KEY` is already in project secrets.

## Plan

### Step 1 — Add the domain in Resend (manual, one-time)
You (or whoever owns the Resend account) log into resend.com → **Domains → Add Domain** → enter `resustainability.com`. Resend immediately displays:
- 1× SPF TXT record
- 3× DKIM CNAME records
- 1× DMARC TXT record (optional)
- 1× MX record for bounces (optional)

Copy these and forward them verbatim to the client's IT team. They publish them on `resustainability.com` DNS. Once Resend shows "Verified", we proceed to Step 2.

> No code changes happen in Step 1. I cannot do this for you — Resend dashboard access is required.

### Step 2 — Migrate Edge Functions from Nodemailer/Gmail to Resend

Rewrite three functions to send via Resend using `visitor@resustainability.com` as the sender:

- **`supabase/functions/send-email/index.ts`** — replace nodemailer transport with Resend API call (`https://api.resend.com/emails`). Keep template lookup, placeholder replacement, and `email_logs` insert intact. Sender = `"VisiGuard" <visitor@resustainability.com>`.
- **`supabase/functions/send-email-badge/index.ts`** — replace `from: "VisiGuard <onboarding@resend.dev>"` with `visitor@resustainability.com`. Drop the sandbox owner-redirect fallback (no longer needed once domain is verified).
- **`supabase/functions/test-smtp/index.ts`** — repurpose to send a test email via Resend so users can verify the new setup from Settings.

All three use the existing `RESEND_API_KEY` secret.

### Step 3 — Update Settings UI

In `src/pages/Settings.tsx` SMTP tab:
- Add a status banner: "Email sending is configured via Resend — sender: visitor@resustainability.com (verified)".
- Keep the existing custom-SMTP form below as a fallback for future clients who insist on their own SMTP.
- Update the "Send test email" button to call the new test function.

### Step 4 — Hand records to the client

After Step 1, message your client's IT team with the records Resend generated. Sample wording:

> *"To send mail as `visitor@resustainability.com` from VisiGuard, please add the following DNS records to `resustainability.com`. They authorize Resend (our email service provider) to send on your behalf and let receiving mail servers verify the authenticity of our messages."*
>
> Then list the SPF + 3 DKIM CNAMEs + DMARC + MX rows from Resend's dashboard.

## Files affected

- `supabase/functions/send-email/index.ts` — rewrite (nodemailer → Resend)
- `supabase/functions/send-email-badge/index.ts` — rewrite, drop sandbox fallback
- `supabase/functions/test-smtp/index.ts` — repurpose for Resend test
- `src/pages/Settings.tsx` — add Resend status banner in SMTP tab

## What I need from you to proceed

1. Confirm you (or the Resend account owner) will add `resustainability.com` in resend.com and forward the displayed DNS records to the client's IT team.
2. Once the client publishes them and Resend shows **Verified**, tell me and I'll execute Steps 2–3 in one pass.

If you want, I can also pre-write the email to send to the client's IT team explaining what each record does — say the word.

