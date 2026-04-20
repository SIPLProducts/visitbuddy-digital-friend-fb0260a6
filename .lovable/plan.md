

User wants email header refinements:
1. Logo bigger
2. Less padding between edge and logo (logo flush-ish to left)
3. "Re Sustainability" company name in **red** (`primary_color` / `#dc2626`)
4. Company name **centered** (middle of header), not next to logo

Currently all 4 email functions use a 2-cell table layout with logo (56×56) on the left and company name in dark color next to it with a small accent underline.

Need to redesign the header block in all 4 edge functions to:
- Larger logo (≈88×88)
- Minimal left padding (≈8px) so logo sits close to edge
- Company name centered horizontally in red, larger font
- Subtitle ("Visitor Approval Required" etc.) stays below name, also centered, smaller/grey

Best email-safe layout: 3-cell table — left logo cell (fixed width), center cell with name+subtitle (text-align:center), right spacer cell mirroring logo width to keep the name truly centered.

## Plan

Redesign the email header in all 4 Edge Functions for a bigger flush-left logo and a centered red company name.

### New header structure (applied to all 4 templates)

```text
[ logo 88×88 ]        Re Sustainability        [ spacer 88px ]
                       <subtitle, grey, sm>
```

- White background strip, ~104px tall, bottom border `#e5e7eb`
- Outer table padding: `padding: 12px 8px` (was `18px 24px`) — logo sits ~8px from left edge
- 3-column layout (email-safe):
  - Left cell: width `96px`, logo `88×88` (was `56×56`), `object-fit:contain`, no border-radius box
  - Center cell: `text-align:center`, vertical-align middle
    - Company name: `font-size: 22px; font-weight: 800; color: <primary_color || #dc2626>` (was dark `#0f172a`, now red)
    - Subtitle below: `font-size: 12px; color: #64748b; margin-top: 4px` (no underline accent — centered text doesn't need it)
  - Right cell: width `96px`, empty spacer (keeps name visually centered)

Keeps the layout email-client-safe (Outlook, Gmail) by using a single `<table>` with explicit widths and inline styles.

### Files to update

1. `supabase/functions/notify-host/index.ts` — both `generateHostApprovalEmail` and `generateVisitorConfirmationEmail`
2. `supabase/functions/approve-visitor/index.ts` — `generateApprovedBadgeEmail`
3. `supabase/functions/send-email-badge/index.ts` — inline badge HTML
4. `supabase/functions/send-email/index.ts` — `generateHtmlEmail` wrapper

### Unchanged
- White header background, footer, branding fetch from `tenant_settings`, SMTP delivery, fallbacks (RESL logo URL + `#dc2626`).

### Deploy
Redeploy all four functions: `notify-host`, `approve-visitor`, `send-email-badge`, `send-email`.

After deploy, send a test approval/badge email — header shows a large RESL logo flush to the left and "Re Sustainability" centered in red.

