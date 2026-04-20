

## Fix broken logo + collapsed header layout in all branded emails

### Problem (from screenshot)
The email shows a tiny broken-image icon next to the alt-text **"Re Sustainability"** stacked vertically. The header doesn't render at all because the email client (Gmail in this case) is not loading the remote logo from Supabase storage — it falls back to the alt-text and the table cells collapse.

The logo URL itself works (HTTP 200, valid PNG, public, CORS open). The issue is purely how mail clients handle remote images:
- Gmail's image proxy occasionally refuses Supabase storage URLs.
- Many recipients have "Ask before displaying external images" turned on, so the image is blocked by default.
- Outlook desktop blocks remote images by default for unknown senders.

The reliable industry fix is to **embed the logo as an inline attachment using a CID (Content-ID)**. With CID embedding, the logo travels inside the email itself and renders on first open without any external fetch — no proxy, no permission prompt, no broken icon.

### Fix

Update every email-sending Edge Function to attach the RE logo as an inline image via Nodemailer and reference it as `cid:re-logo` inside the HTML, instead of pointing `<img src>` at a Supabase URL.

Nodemailer supports this natively:

```ts
attachments: [{
  filename: 're-logo.png',
  path: 'https://bzyvykyuiuihzvhdpxsi.supabase.co/storage/v1/object/public/branding/re-logo-mark.png',
  cid: 're-logo',           // referenced as <img src="cid:re-logo">
  contentDisposition: 'inline',
}]
```

The function fetches the logo once at send time, embeds it, and the recipient sees the red "re" mark inline on every device.

### Layout fix (same change)

While we're touching the header HTML, also harden the table so it doesn't collapse when the image is missing OR when the client narrows the viewport:

- Set the outer `<table>` to `width="100%"` with explicit pixel `width` on the logo cell (`80px`).
- Add `mso-table-lspace:0;mso-table-rspace:0` to placate Outlook.
- Force the header `<table>` to a fixed `min-width:320px` so it never wraps to a single column.
- Add a non-breaking-space spacer column so the centered text never collapses underneath the logo cell.

These changes make the header render correctly even on the rare client where the inline image still doesn't load.

### Files to update

All four email-sending Edge Functions:

1. `supabase/functions/send-email/index.ts`
   - Change `<img src="${branding.logoUrl}">` → `<img src="cid:re-logo">`.
   - Pass `attachments: [{ filename, path: branding.logoUrl, cid: 're-logo', contentDisposition: 'inline' }]` in the `transporter.sendMail({...})` call.
   - Tighten header table widths (see "Layout fix" above).

2. `supabase/functions/send-email-badge/index.ts` — same three changes.

3. `supabase/functions/notify-host/index.ts` — `brandedHeader(...)` swaps to `cid:re-logo`. The `sendMail({...})` call adds the `attachments` array.

4. `supabase/functions/approve-visitor/index.ts` — same three changes.

The logo asset stays at `branding/re-logo-mark.png` in storage. The `<img>` tags inside the badge HTML (visitor photo, QR codes) are NOT changed — only the **company logo** in the header is moved to CID. Photos and QR codes remain at their public URLs because those are dynamic per-visitor and CID-embedding them adds no benefit.

### Deploy

Redeploy:
- `send-email`
- `send-email-badge`
- `notify-host`
- `approve-visitor`

### Verification

```text
1. Trigger the host-notification email (create a new visitor with host email).
   → Open in Gmail web: red "re" logo is visible on first open, no
     "Display images below" prompt, header renders horizontally with
     "Re Sustainability" in red next to the logo.

2. Same email in Gmail mobile app and Outlook desktop.
   → Logo visible, header in one row, no broken-image icon.

3. Approve the visitor.
   → "Visit Approved" email: logo inline, header correct.

4. Check the visitor in (badge email).
   → Visitor receives the badge email with logo inline + QR code intact.

5. Send a generic test email through any template.
   → Header logo renders without external fetching.
```

### Out of scope
- WhatsApp message bodies — text only, no image embedding needed.
- Print badge / Safety Permit on-screen — those use bundled local assets, already correct.
- Changing the logo asset itself — staying with `re-logo-mark.png`.
- Switching email provider — staying on the existing SMTP / Nodemailer flow.

