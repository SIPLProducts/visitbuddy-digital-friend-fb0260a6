# Custom Password Reset via Existing SMTP

Replace the GoTrue-based password reset with a custom edge function that uses your existing `email_config` SMTP (same one used by `send-email`, `send-email-badge`). Works identically in Lovable Cloud and self-hosted Supabase — zero GoTrue SMTP config needed.

## 1. New edge function: `supabase/functions/send-password-reset/index.ts`

Mirrors the pattern of `send-email`:

- **Input**: `{ email, redirectTo }` — both required.
- **Auth**: public (no JWT) — needs to work from the login page. Validates email format server-side.
- **Generate recovery link** with the service role key:
  ```ts
  admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  })
  ```
  This returns `properties.action_link` (the GoTrue recovery URL with the token) **without** sending any email.
- **Load SMTP** from `email_config` (`is_active = true`, single row) — same query `send-email` uses.
- **Send** via Nodemailer with the same branded HTML template style (RE logo via `cid:re-logo`, primary color from `tenant_settings`).
- **Email contains**: greeting, "Reset Password" button → `action_link`, plain-text fallback link, 1-hour validity notice, "ignore if not you" footer.
- **Privacy**: if the email doesn't exist or `generateLink` fails, still return `{ success: true }` (no enumeration leak). Only return 500 when SMTP config is missing.
- **Log** to `email_logs` with `template: "password_reset"`.

## 2. Frontend: `src/pages/Auth.tsx`

Replace the `handleForgotPassword` body that currently calls `supabase.auth.resetPasswordForEmail(...)` with:

```ts
const { data, error } = await supabase.functions.invoke("send-password-reset", {
  body: { email: parsed.data, redirectTo: `${window.location.origin}/reset-password` },
});
```

Same UX (toast on success/error, `resetLoading` state, "Enter your email above first" guard). The existing `/reset-password` page works unchanged because `action_link` contains the same recovery token GoTrue would have emailed natively.

## 3. Deployment notes

- Edge function deploys automatically on save (Lovable Cloud + self-hosted via `deploy.sh`).
- No new secrets needed — service role key is already in env.
- No `email_config` schema changes.
- Self-hosted servers must have outbound access to the SMTP host already configured for badge emails — which they do (badges already work).
- GoTrue's own SMTP can stay on defaults (it's no longer used for recovery).

## Files touched

- `supabase/functions/send-password-reset/index.ts` (new)
- `src/pages/Auth.tsx` (edit `handleForgotPassword` only)

## Out of scope

- GoTrue SMTP env vars (Option A) — not needed.
- Custom recovery token generation — using GoTrue's native token via admin API.
- Changes to `/reset-password` page or any other edge function.
