

User wants the email branding plan to use a **white logo background** instead of black. Otherwise the previous plan stands. Need a logo URL choice still — let me re-present the concise plan with the white-header correction and re-ask the logo source.

## Updated Plan: Branded Email Templates (white logo header)

Re-theme all visitor/host approval & badge emails to match printed badge branding — but with a **white** header background (not black) for the logo.

### Header (new, applied to all 4 templates)
- **White background** strip (~88px tall), thin bottom border `#e5e7eb`
- 56×56 logo (RESL) on the left, on white — no dark box
- Right side: **Company name** ("Re Sustainability") in dark text + dynamic subtitle ("Visitor Approval Required", "Visit Approved", "Visit Submitted", etc.)
- Subtitle uses tenant `primary_color` (fallback `#dc2626`) as a thin accent underline

### Footer (unchanged from prior plan)
- Light gray bar (`#f8fafc`)
- "Powered by **Sharvi Infotech**" + `www.sharviinfotech.com` link

### Tenant-driven branding (read once per call from `tenant_settings`)
- `company_name` → header title (fallback "Re Sustainability")
- `logo_url` → header logo (fallback: hosted RESL PNG — see logo question below)
- `primary_color` → accent color on info panels & header underline (fallback `#dc2626`)

### Files to change
1. `supabase/functions/notify-host/index.ts` — re-theme host approval + visitor confirmation
2. `supabase/functions/approve-visitor/index.ts` — re-theme approved-badge email
3. `supabase/functions/send-email-badge/index.ts` — re-theme badge HTML
4. `supabase/functions/send-email/index.ts` — re-theme generic wrapper
5. Redeploy all four functions

### Unchanged
- SMTP delivery via nodemailer + `email_config`
- Request/response shapes, `email_logs`, Approve/Reject buttons, QR images

### One open question — logo URL

Edge Functions can't import `src/assets/resl-logo.png`. Pick the source:

**A.** Upload `resl-logo.png` to a public Supabase storage bucket (e.g. `branding/resl-logo.png`) and use that URL as the bundled fallback. **Recommended.**

**B.** Provide an existing public logo URL (paste it) — hard-code as fallback.

**C.** No bundled fallback — rely solely on `tenant_settings.logo_url` set from Settings → Branding.

Reply with **A**, **B** (+ URL), or **C** and I'll implement.

