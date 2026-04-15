

# Add Sharvi Infotech Branded Footer to All Emails

## Overview
Add the Sharvi Infotech branding footer below the "automated email / do not reply" line in all email-generating Edge Functions.

## Footer Content
After the existing "do not reply" / "Powered by" text, add:
```
🚀 Built with excellence by Sharvi Info Tech Pvt. Ltd.
🌐 https://www.sharviinfotech.com/
Transforming ideas into powerful digital solutions.
```

## Files to Update

### 1. `supabase/functions/send-email/index.ts`
- Add branded footer after the "This is an automated email" paragraph in the `generateHtmlEmail` function

### 2. `supabase/functions/notify-host/index.ts`
- Add branded footer in all 3 email HTML templates (`generateHostApprovalEmail`, `generateVisitorConfirmationEmail`, and the approval notification email)

### 3. `supabase/functions/approve-visitor/index.ts`
- Add branded footer in the visitor approval email HTML template

### 4. `supabase/functions/send-email-badge/index.ts`
- Add branded footer after the existing "Powered by VisiGuard VMS" line

## Footer HTML (consistent across all)
```html
<div style="background:#1e293b;padding:16px;text-align:center;">
  <p style="margin:0;color:#f1f5f9;font-size:12px;">🚀 Built with excellence by <strong>Sharvi Info Tech Pvt. Ltd.</strong></p>
  <p style="margin:6px 0;"><a href="https://www.sharviinfotech.com/" style="color:#38bdf8;font-size:11px;text-decoration:none;">🌐 www.sharviinfotech.com</a></p>
  <p style="margin:0;color:#94a3b8;font-size:11px;font-style:italic;">Transforming ideas into powerful digital solutions.</p>
</div>
```

Placed as the very last section inside the email container, after the "do not reply" / "Powered by" footer.

