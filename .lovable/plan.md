

## Remove "Sustainability" wordmark from RE logo and remove Sharvi branding everywhere

### Goal
Across the app, wherever the **RE logo** appears, only the circular **"re"** mark should show. The grey **"Sustainability"** wordmark below it must be cropped out. The header banner / company name text stays untouched. All **"Powered by Sharvi Infotech"** lines are removed from emails, WhatsApp messages, and badges.

### Approach for the logo
The current asset `src/assets/resl-badge-logo.png` is a single image containing the red "re" circle **and** the grey "Sustainability" wordmark. Cropping it visually is the cleanest fix:

1. Generate a new asset `src/assets/re-logo-mark.png` that contains only the red circular "re" mark (top portion of the original image, no "Sustainability" text).
2. Replace every import of `resl-badge-logo.png` with the new `re-logo-mark.png`. This automatically fixes:
   - Safety Permit badge (`SafetyPermitBadge.tsx`)
   - Print badge page (`PrintBadge.tsx`)
   - Email logo (the same file is referenced from edge function HTML via a public URL)

For the email functions, the logo is currently loaded as a hosted URL inside `brandedHeader(...)`. We will:
- Upload the cropped `re-logo-mark.png` into the existing public `branding` storage bucket (e.g. `branding/re-logo-mark.png`).
- Point each edge function's `brandedHeader` `<img src="...">` at that public URL.

### Files to change

**Assets**
- Add `src/assets/re-logo-mark.png` — cropped logo (red "re" circle only).
- Upload same file to public storage `branding/re-logo-mark.png` for use by emails.

**Frontend (logo swap only — headers untouched)**
- `src/components/badge/SafetyPermitBadge.tsx` — change import from `resl-badge-logo.png` to `re-logo-mark.png`. Header band + company name text stay exactly as they are. Remove only the bottom "Powered by Sharvi Infotech" footer block.
- `src/pages/PrintBadge.tsx` — same logo swap. Header banner stays. Remove the "Powered by Sharvi Infotech" line at the bottom of the printable page (if present).

**Edge functions — emails**
For each function below, inside `brandedHeader(...)` swap the `<img src>` to the new `branding/re-logo-mark.png` public URL. Header text, company name and red colour stay. In `brandedFooter(...)` (and the plain-text variants), delete the line `Powered by Sharvi Infotech — www.sharviinfotech.com` (HTML + text).

- `supabase/functions/send-email/index.ts`
- `supabase/functions/send-email-badge/index.ts`
- `supabase/functions/notify-host/index.ts`
- `supabase/functions/approve-visitor/index.ts`

**Edge functions — WhatsApp**
Remove the `_Powered by VisiGuard VMS_` / Sharvi footer line from the message body:
- `supabase/functions/send-whatsapp-badge/index.ts`
- `supabase/functions/send-vehicle-whatsapp/index.ts`
- `supabase/functions/notify-host/index.ts` (WhatsApp text branch — Sharvi line only)
- `supabase/functions/approve-visitor/index.ts` (WhatsApp text branch — Sharvi line only)

### Out of scope (intentionally untouched)
- The **header band** ("VISITOR PASS", red banner, company name `Resustainability` shown in the dark band of the badge) — unchanged.
- Auth / login screen Sharvi footer (internal staff-facing).
- Product Proposal, User Manual, Resource Requirements, Product Features pages (internal sales/spec docs).
- Long consent paragraph on the badge that mentions "Resustainability" — that is legal copy, not branding.

### Deploy
Redeploy:
- `send-email`
- `send-email-badge`
- `notify-host`
- `approve-visitor`
- `send-whatsapp-badge`
- `send-vehicle-whatsapp`

### Verification
```text
1. Print a badge.
   → Red "re" circle only. No grey "Sustainability" word under it.
   → Red "Resustainability" header band still visible (unchanged).
   → No "Powered by Sharvi Infotech" footer.

2. New visitor created (phone + email).
   → Host email + Visitor "Request Submitted" email show only the red "re" mark.
   → No Sharvi line in HTML or plain text footer.
   → Host WhatsApp message has no Sharvi line.

3. Approve the visitor.
   → Visitor "Visit Approved" email + WhatsApp: re-mark only, no Sharvi footer.

4. Check the visitor in.
   → Checkout-QR email + WhatsApp: re-mark only, no Sharvi footer.

5. Register a commercial vehicle.
   → Driver WhatsApp pass: no Sharvi / "Powered by" line.
```

