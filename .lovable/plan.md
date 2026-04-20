

## Make WhatsApp messages mirror the email template

### What's wrong today
The WhatsApp body is structured differently from the email and includes the literal text `_VisiGuard Visitor Management System_` at the bottom. The email instead uses the tenant's **company name + logo** in a branded header and a **"Powered by Sharvi Infotech"** footer. WhatsApp also can't render HTML/logos, but it *can* show the logo as an attached **image** alongside the text — so we can achieve full visual parity.

### Goal
Both host and visitor WhatsApp messages should look like the WhatsApp equivalent of the email — same company branding (logo image + name), same section ordering, same details, and the same footer wording. No "VisiGuard" string anywhere.

### What changes — `supabase/functions/notify-host/index.ts` only

**1. Build a shared WhatsApp template helper** that mirrors the email layout in WhatsApp text formatting:

```
[Logo image attached]

*{Company Name}*
_{Subtitle — e.g. Visitor Approval Required}_
━━━━━━━━━━━━━━━━━━━━

Dear *{Recipient}*,

{Intro line — same wording as the email}

📋 *Details*
• Visitor: {name}
• ID: {visitor_id}
• Phone: {phone}
• Company: {company}
• Purpose: {purpose}
• Department: {department}
• Entry Gate: {gate}
• Date: {date}
• Time: {time}

👥 *Accompanying Persons ({n})*    ← only if any
1. {name} ({phone}) — 💻 Laptop, 📱 Mobile
…

✅ Approve: {link}                 ← only when pending
❌ Reject:  {link}

━━━━━━━━━━━━━━━━━━━━
This is an automated message. Please do not reply.
Powered by *Sharvi Infotech* — www.sharviinfotech.com
```

**2. Use `branding.companyName` and `branding.logoUrl`** (already fetched via `getBranding()`):
- Header line uses the *actual* tenant company (e.g. "Re Sustainability"), not "VisiGuard".
- The logo URL is sent as the message's `mediaUrl` so WhatsApp displays the company logo above the text — **for both** the WhatsApp Web bridge call and the Twilio fallback. For the host message, when a visitor photo exists we prefer the visitor photo (more useful for security); otherwise the logo is shown. For the visitor confirmation we always send the logo.

**3. Wording parity**
- Host pending: subtitle "Visitor Approval Required", intro "A visitor is waiting for your approval. Please review the details below and take action." (verbatim from email).
- Host arrived: subtitle "Visitor Arrival Notification", intro "A visitor has arrived to meet you. Details below."
- Visitor pending: subtitle "Visit Request Submitted", intro "Your visit request has been submitted and is now pending approval from your host." + status line "⏳ Status: Awaiting Host Approval".
- Visitor checked-in: subtitle "Check-in Confirmed", intro "Your check-in has been recorded successfully!"

**4. Remove every occurrence** of `_VisiGuard Visitor Management System_` and replace with the branded footer block above.

**5. Bridge call** — `sendViaBridge(phone, message, mediaUrl)` already supports the third argument; we just need to pass the resolved logo/photo URL on every call (host message gets `visitor.photo_url ?? branding.logoUrl`, visitor message gets `branding.logoUrl`).

### Files touched
- **Edit** `supabase/functions/notify-host/index.ts` only — add a `buildWhatsAppMessage(...)` helper, replace both inline host/visitor message blocks, and pass `mediaUrl` on every WhatsApp send (bridge + Twilio).

### What you'll see after the fix

```text
1. Bridge stays running (no restart needed).
2. Create a new visitor with host phone + visitor phone + visitor email.
3. Within ~5 s on the host's WhatsApp:
   [Visitor's photo, OR company logo if no photo]

   *Re Sustainability*
   _Visitor Approval Required_
   ━━━━━━━━━━━━━━━━━━━━
   Dear *Ramesh*,
   A visitor is waiting for your approval...
   📋 *Details*
   • Visitor: ...
   ...
   ✅ Approve: <link>
   ❌ Reject:  <link>
   ━━━━━━━━━━━━━━━━━━━━
   This is an automated message. Please do not reply.
   Powered by *Sharvi Infotech* — www.sharviinfotech.com

4. Visitor's WhatsApp shows the same layout with logo + "Visit Request
   Submitted" subtitle + Awaiting Host Approval status line.
5. The emails received in parallel are unchanged — both channels now
   carry visually equivalent content.
```

### Out of scope
- Vehicle WhatsApp (`send-vehicle-whatsapp`) — separate function, not touched here.
- Approve-visitor badge WhatsApp — already branded; unchanged.
- Bridge / Twilio plumbing — unchanged.

