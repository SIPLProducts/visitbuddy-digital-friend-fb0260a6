
## What I found

- The test-email function is running, but the email provider is rejecting the request with a `403` sandbox restriction — this is why the UI shows a generic edge-function error.
- The current function sends from `VisiGuard VMS <onboarding@resend.dev>`, which only allows test delivery to the owner address `bala@sharviinfotech.com` until a sending domain is verified.
- The recipient in your screenshot is `chandra910091@gmail.com`, so that request is expected to fail right now.
- `src/pages/Settings.tsx` only surfaces the generic `non-2xx` error, so the real reason is hidden.
- The saved SMTP fields are not the current cause of failure: `supabase/functions/test-email/index.ts` now uses the email provider API, and only reads `email_config` for display text.
- This project already has a custom domain available (`visiguard.sharvisoftwareservices.com`), but it is not yet configured as an email-sending domain.

## Plan

### 1. Configure the sending domain
- Set up the project’s existing custom domain for email sending.
- After that, use a sender address on that verified domain instead of `onboarding@resend.dev`.

### 2. Fix the test-email function behavior
- Update `supabase/functions/test-email/index.ts` to:
  - use the verified sender address when available
  - detect the sandbox restriction explicitly
  - return a clear, user-friendly response for that case instead of a raw `500`
  - optionally fall back to `bala@sharviinfotech.com` for temporary test delivery, matching the badge-email pattern

### 3. Improve the Settings UI
- Update `src/pages/Settings.tsx` so the toast shows the real backend message instead of only “Edge Function returned a non-2xx status code”.
- Add helper text in the email test dialog/card explaining:
  - before domain verification, test emails only work to Bala’s address
  - after domain setup, any recipient can be used
- Clarify that delivery depends on the verified sender domain, not just the saved SMTP form fields.

### 4. Verify end to end
- Test with `bala@sharviinfotech.com` to confirm the function succeeds immediately.
- Test with another email before domain verification to confirm the app shows a clear explanation instead of the generic edge-function error.
- Test again after domain setup to confirm real delivery to external recipients.

## Technical details

- Relevant files:
  - `supabase/functions/test-email/index.ts`
  - `src/pages/Settings.tsx`
  - pattern reference: `supabase/functions/send-email-badge/index.ts`
- I do not plan to switch back to direct Gmail SMTP sending in the edge function, because that was the earlier runtime compatibility issue.
- The permanent fix is verified-domain sending plus better error handling, not another SMTP retry.
