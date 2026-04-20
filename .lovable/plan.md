

## Fix the email header color — show red, not blue

### What's happening
The branded email header in both `send-email` and `send-email-badge` reads the company name color from `tenant_settings.primary_color`. Your tenant currently has that value set to a blue (likely `#2563eb` or similar), so the "Re Sustainability" title renders blue even though the code falls back to red (`#dc2626`) only when no value is stored.

There are two ways to fix this — pick one:

### Option A — Hardcode red in the email header (recommended, matches the Safety Permit badge)
The Safety Permit badge already hardcodes `#dc2626` regardless of tenant settings (per project memory). Doing the same for emails keeps both channels visually consistent and immune to accidental color changes in Settings.

Edit two edge functions, replacing the dynamic primary color with the fixed brand red **only for the company-name title**:

- `supabase/functions/send-email/index.ts` — in `generateHtmlEmail`, change
  ```html
  color:${branding.primaryColor};
  ```
  on the `<div>` that renders `${branding.companyName}` to a hardcoded
  ```html
  color:#dc2626;
  ```
- `supabase/functions/send-email-badge/index.ts` — same change on the company-name `<div>` inside the header table.

No other styles change. The `branding.primaryColor` value still gets read (so future buttons/accents can use it), but the header title is locked to the Re Sustainability red.

Then redeploy both functions:
- `send-email`
- `send-email-badge`

### Option B — Update the tenant setting instead
If you'd rather keep the header dynamic, open Settings → Branding and set Primary Color to `#dc2626`. No code change. Downside: the next person who edits Settings can break the brand color again.

### Recommendation
Go with **Option A**. The badge already hardcodes red for the same reason; mirroring it in email keeps "Re Sustainability" red everywhere it appears, regardless of who edits Settings.

### Files touched (Option A)
- Edit `supabase/functions/send-email/index.ts` — hardcode `#dc2626` on the company-name div in `generateHtmlEmail`.
- Edit `supabase/functions/send-email-badge/index.ts` — hardcode `#dc2626` on the company-name div in the badge HTML.
- Redeploy both edge functions.

No DB changes, no template changes, no WhatsApp/SMS impact.

### What you'll do after the fix
```text
1. Trigger any email — create a visitor (host approval email) or
   approve a visitor (visitor check-in QR email) or check a visitor in
   (visitor checkout QR email).
2. Open the received email.
   → "Re Sustainability" in the header now renders in red (#dc2626),
     matching the Safety Permit badge header.
3. Body text, footer, and "Powered by Sharvi Infotech" line are unchanged.
```

### Out of scope
- WhatsApp templates (text-only, no color).
- The Safety Permit print badge (already red).
- Other color usages of `primaryColor` elsewhere in the app.

