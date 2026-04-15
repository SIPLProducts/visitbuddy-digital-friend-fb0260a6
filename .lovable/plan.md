

# Visitor Form Validation + IST Timezone Fix

## Problem
1. **Date of Visit** is not enforced as mandatory and allows past dates
2. **Mobile number** and **Email** are not mandatory fields
3. **All email timestamps** in Edge Functions use server UTC time instead of IST (India Standard Time), showing times like "3:15 AM" instead of the correct Indian time

## Changes

### 1. `src/pages/NewVisitor.tsx` — Form Validation
- Change `email` from optional to **required** with valid email validation
- Change `phone` from optional to **required** with minimum length
- Change `scheduled_date` to **required** (non-optional) and add a `.refine()` that rejects past dates (date must be ≥ today)
- Disable past dates in the Calendar picker using `disabled={(date) => date < startOfToday()}`

### 2. `src/pages/SelfService.tsx` — Form Validation
- Make email and phone mandatory in the self-service form validation
- Add past-date validation if date picker exists there

### 3. IST Timezone Fix — All Edge Functions
Add `timeZone: "Asia/Kolkata"` to every `toLocaleDateString` and `toLocaleTimeString` call across all Edge Functions. Deno's `toLocaleString` supports IANA timezones, so this forces IST output regardless of server location.

**Files affected:**
- `supabase/functions/notify-host/index.ts`
- `supabase/functions/approve-visitor/index.ts`
- `supabase/functions/send-email-badge/index.ts`
- `supabase/functions/send-whatsapp-badge/index.ts`
- `supabase/functions/send-sms-badge/index.ts`
- `supabase/functions/send-vehicle-whatsapp/index.ts`

**Pattern — before:**
```js
new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
```

**Pattern — after:**
```js
new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })
```

Same for `toLocaleDateString` — add `timeZone: "Asia/Kolkata"`.

## Files Changed
- `src/pages/NewVisitor.tsx` — mandatory email, phone, date validation (no past dates)
- `src/pages/SelfService.tsx` — mandatory email, phone validation
- 6 Edge Functions — add `timeZone: "Asia/Kolkata"` to all date/time formatting

