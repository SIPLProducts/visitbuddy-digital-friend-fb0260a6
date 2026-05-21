# Forgot Password + Hide "Create one"

## 1. Auth page (`src/pages/Auth.tsx`)
- Replace the inert "Forgot password?" `<button>` with a working handler:
  - Read email from `loginForm.getValues('email')`; validate via `loginSchema.shape.email`.
  - If invalid/empty, toast: "Enter your email above first".
  - Call `supabase.auth.resetPasswordForEmail(email, { redirectTo: \`${window.location.origin}/reset-password\` })`.
  - Toast success: "Password reset link sent. Check your inbox." Toast error on failure.
  - Add a `resetLoading` state to disable the link while in-flight.
- Comment out the "Don't have an account? / Create one" toggle block at the bottom (keep code commented for easy re-enable). Also comment out the unused signup form section/`isLogin` toggle UI is left intact but the button to switch is hidden, so signup form will never render. Simplest: wrap the toggle `<p>` in `{false && (...)}` or just comment it out.

## 2. New route: Reset Password page (`src/pages/ResetPassword.tsx`)
Public page that:
- On mount, lets Supabase process the recovery hash (`onAuthStateChange` fires `PASSWORD_RECOVERY`); track a `canReset` flag.
- Renders a form with `password` + `confirmPassword` (zod-validated, min 6, match).
- Submits `supabase.auth.updateUser({ password })`. On success: toast, `signOut`, navigate to `/auth`.
- Branded to match Auth page (RE Sustainability logo, same card style).

## 3. Routing (`src/App.tsx`)
- Add public route `/reset-password` → `<ResetPassword />` (outside `ProtectedLayout`).

## Out of scope
- Email template customization (Supabase default recovery email is used).
- Signup form code itself (left in file, just unreachable).
- Any backend/edge function changes.

## Files touched
- `src/pages/Auth.tsx` (edit)
- `src/pages/ResetPassword.tsx` (new)
- `src/App.tsx` (add route)
