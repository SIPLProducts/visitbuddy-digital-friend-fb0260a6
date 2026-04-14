

# Notify Gate Security Users on Visitor Approval

## Summary
After a visitor is approved (status changes from `pending_approval` to `scheduled`), insert a notification for all `gate_security` users at the visitor's location so they know to proceed with check-in.

## Changes

### `supabase/functions/approve-visitor/index.ts`
After the successful status update to `scheduled` (around line 111), add logic to:
1. Determine the visitor's `location_id` from the gate relation (`visitor.gate?.location_id` is already fetched in the query)
2. Query `user_location_roles` for all users with `role = 'gate_security'` at that location
3. Insert a notification row for each gate security user into the `notifications` table with:
   - `title`: "Visitor Approved"
   - `message`: "{visitor.name} has been approved by host. Ready for check-in."
   - `type`: "success"
   - `user_id`: each gate security user's `user_id`

This uses the service role client already available in the function, so no RLS issues. Gate security users will receive the notification in real-time via the existing realtime subscription on the `notifications` table.

