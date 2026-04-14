

# Fix Test Email Edge Function

## Problem
The `test-email` edge function uses the `denomailer` SMTP library, which fails in the Deno edge runtime with `InvalidData: received corrupt message of type InvalidContentType` when connecting to Gmail SMTP (`smtp.gmail.com:587`). This is a known incompatibility — STARTTLS on port 587 doesn't work with `denomailer` in Supabase edge functions.

## Fix
Replace `denomailer` with the **Resend HTTP API**. The `RESEND_API_KEY` secret is already configured. This is a simple HTTP `fetch` call — no TCP/SMTP sockets needed.

### Changes

**1. Rewrite `supabase/functions/test-email/index.ts`**
- Remove `denomailer` import
- Use `fetch` to call `https://api.resend.com/emails`
- Authenticate with `RESEND_API_KEY` from environment
- Still read `email_config` from the database for sender info display in the email body
- Use `onboarding@resend.dev` as the `from` address (Resend sandbox default — works without domain verification)
- Keep the same request/response contract so the Settings UI needs no changes

**2. Deploy the updated function**

**3. Test with `curl_edge_functions`** to verify it returns 200

### Technical details
- The `from` address must use a Resend-verified domain. Since we don't have one, `onboarding@resend.dev` is the sandbox fallback — it works for testing but emails may land in spam.
- No frontend changes needed — `Settings.tsx` already calls `supabase.functions.invoke('test-email', { body: { receiver_email } })`.

