

## Make the RE logo render inline immediately in approval (and all branded) emails

### Problem
In the approve-visitor email the logo area shows a clickable placeholder; only after tapping does the red "re" mark appear. That happens because the current implementation passes `path: logoUrl` to Nodemailer:

```ts
attachments: [{ filename: 're-logo.png', path: branding.logoUrl, cid: 're-logo', contentDisposition: 'inline' }]
```

Nodemailer streams that remote URL into the MIME part at send time. With remote-streamed parts Gmail often classifies the part as a regular attachment (not inline) — so the `<img src="cid:re-logo">` initially renders as a placeholder until the user explicitly opens the attachment. Outlook web shows the same behaviour.

The fix is to fetch the PNG bytes ourselves and pass them as a binary `content` Buffer with explicit `contentType` and `encoding`. That produces a proper `Content-Type: image/png; Content-Disposition: inline; Content-Transfer-Encoding: base64` MIME part that every major client renders inline on first open.

### Fix

1. Add a small helper at the top of each email-sending Edge Function that fetches the logo once per request and returns a `Uint8Array`:

   ```ts
   async function fetchLogoBytes(url: string): Promise<Uint8Array | null> {
     try {
       const res = await fetch(url, { cache: "no-store" });
       if (!res.ok) return null;
       const buf = new Uint8Array(await res.arrayBuffer());
       return buf;
     } catch { return null; }
   }
   ```

2. Before sending, call it: `const logoBytes = await fetchLogoBytes(branding.logoUrl);`

3. Replace the existing `attachments` block with:

   ```ts
   attachments: logoBytes ? [{
     filename: 're-logo.png',
     content: logoBytes,
     contentType: 'image/png',
     cid: 're-logo',
     contentDisposition: 'inline',
     encoding: 'base64',
   }] : undefined,
   ```

4. Keep the HTML side the same — `<img src="cid:re-logo" ...>` continues to work, just as a properly inline part now.

5. If `logoBytes` is null (network blip), fall back gracefully: still send the email without the inline attachment so the rest of the message goes through. The header text "Re Sustainability" already provides branding.

### Files to update
All four branded-email Edge Functions:

- `supabase/functions/approve-visitor/index.ts` — main culprit shown in the screenshot.
- `supabase/functions/send-email-badge/index.ts` — visitor badge after check-in.
- `supabase/functions/notify-host/index.ts` — host approval-required + visitor "request submitted" emails.
- `supabase/functions/send-email/index.ts` — generic templated email sender used elsewhere.

In each one:
- Add `fetchLogoBytes(...)` helper.
- Fetch `logoBytes` once after computing `branding`.
- Pass it through to the `transporter.sendMail({...})` call (replacing the `path:` form).

No HTML or layout changes needed — the previous CID-embed pass already fixed the layout. Only the attachment payload is changing from URL-streamed to binary buffer.

### Deploy

Redeploy:
- `approve-visitor`
- `send-email-badge`
- `notify-host`
- `send-email`

### Verification

```text
1. Create a new visitor with email + phone.
   → "Visit Request Submitted" email: red "re" mark visible immediately
     in the header (no placeholder, no click required).
   → Host "Approval Required" email: same — logo inline on first open.

2. Approve the visitor.
   → "Visit Approved" email: header shows red "re" mark + "Re Sustainability"
     in red, no clickable placeholder. QR code below renders as before.

3. Check the visitor in.
   → Badge email arrives; header logo inline immediately, QR code intact.

4. Open all three in:
   - Gmail web
   - Gmail mobile app
   - Outlook web
   → Logo visible on first render in every client.
```

### Out of scope
- WhatsApp messages (text only, no inline image issue).
- Print badge / on-screen Safety Permit (uses bundled local asset, already correct).
- Visitor photo / QR code `<img>` tags inside the email body — these stay as remote URLs (they're dynamic per-visitor, CID-embedding adds no benefit and would slow the function down).
- Switching SMTP provider or templates engine.

