

# Auto-Checkout Notifications: Email to Admins + WhatsApp/SMS to Visitors

## Overview
Enhance the `auto-checkout-reminder` edge function to:
1. **Email admins** a summary of visitors not checked out (using Resend, already configured)
2. **WhatsApp/SMS visitors** with a polite message: "You didn't check out from [company]. We assume you've left and are checking out on your behalf. If you're still inside, please contact [bridge number]. Thank you."
3. **Auto-checkout** the visitors after sending notifications (update status to `checked_out`)

## Changes

### 1. Update `auto-checkout-reminder` Edge Function
**File:** `supabase/functions/auto-checkout-reminder/index.ts`

- Expand visitor query to include `phone` and `email` fields
- Fetch tenant settings including `company_name` (for the message) and a bridge/security contact number
- **For each visitor with a phone number:** Send WhatsApp via Twilio (reusing the same Twilio credentials already configured: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`, `TWILIO_SMS_NUMBER`)
  - WhatsApp message: "Dear [Name], you did not check out from [Company]. We are assuming you are no longer inside the premises. We are doing the checkout on your behalf. In case you are still inside, please contact us at [bridge number]. Thank you — [Company] Security"
  - Fallback to SMS if WhatsApp number not configured
- **For admin emails:** Use Resend API (already configured: `RESEND_API_KEY`) to send a summary email to admin users listing all visitors not checked out
- **Auto-checkout:** Update each visitor's status to `checked_out` and set `check_out_time` after notifications are sent
- Keep existing in-app notification logic

### 2. Add `security_contact_number` to tenant_settings
**Migration:** Add column `security_contact_number text DEFAULT NULL` to `tenant_settings`

### 3. Add Security Contact Number field in Settings page
**File:** `src/pages/Settings.tsx`
- Add a "Security Contact Number" input field in the Security tab
- This number is included in the auto-checkout message sent to visitors ("please contact us at...")

### 4. Update `useTenantSettings.ts`
- Add `security_contact_number` to the interface and defaults

## Message Template (WhatsApp/SMS to Visitors)
```
Dear [Visitor Name],

You did not check out from [Company Name]. We are assuming you are no longer inside the premises and are completing the checkout on your behalf.

If you are still inside the facility, please contact our security desk at [Security Contact Number].

Thank you,
[Company Name] Security
```

## Email Template (to Admins)
HTML email listing all visitors not checked out with their name, company, check-in time, and visitor ID. Subject: "⚠️ Auto-Checkout Alert — [count] Visitor(s) Not Checked Out"

## Files Modified
1. SQL migration — add `security_contact_number` column
2. `supabase/functions/auto-checkout-reminder/index.ts` — add email/WhatsApp/SMS + auto-checkout
3. `src/pages/Settings.tsx` — add security contact number field
4. `src/hooks/useTenantSettings.ts` — add new field

