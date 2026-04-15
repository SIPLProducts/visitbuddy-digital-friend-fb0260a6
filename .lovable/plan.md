

# Include Accompanying Visitors in Host Approval Email

## Problem
When a visitor is submitted for approval, the email sent to the host does not include details of accompanying persons, even though this data exists in the `accompanying_visitors` table.

## Changes

### `supabase/functions/notify-host/index.ts`

1. **Fetch accompanying visitors** — After fetching the main visitor details, query `accompanying_visitors` where `visitor_id = visitor.id` to get names, phones, and device info for all companions.

2. **Update `generateHostApprovalEmail`** — Add a new parameter for accompanying visitors. If any exist, render an additional section in the email after the main visitor details table:
   - Section header: "Accompanying Persons (X)"
   - Table listing each person's name, phone, and device details (laptop/mobile)

3. **Update WhatsApp message** — Append accompanying visitor names and phones to the host WhatsApp notification body when `isPendingApproval` is true.

## Files Changed
- `supabase/functions/notify-host/index.ts`

