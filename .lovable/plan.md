

# Add Purpose of Visit to Visitor Confirmation Email

## Problem
The visitor confirmation email (sent to visitor when their request is submitted) does not include the purpose of visit, while the other two emails already do.

## Changes

### `supabase/functions/notify-host/index.ts`

1. **Update `generateVisitorConfirmationEmail` function signature** — Add a `purpose` parameter (string, optional).

2. **Add purpose row to the email template** — Insert a conditional row for purpose in the details table (between Visitor ID and Host rows):
   ```html
   ${purpose ? `<tr><td style="padding:4px 8px;font-weight:bold;">Purpose:</td><td style="padding:4px 8px;">${purpose}</td></tr>` : ""}
   ```

3. **Update the function call** — Pass `visitor.purpose` when calling `generateVisitorConfirmationEmail`.

## Files Changed
- `supabase/functions/notify-host/index.ts` — Add purpose to visitor confirmation email template

