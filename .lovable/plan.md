## Problem

After a host approves a visitor with a **future visit date**, the visitor's status becomes `scheduled`, but the **Check In** action is hidden in the Visitors list. This is because `VisitorActions.tsx` gates the Check‑In controls behind `isScheduledToday` (only visible if `scheduled_date === today`). The Check‑In/Out page itself works, but the per‑row action on the Visitors table doesn't.

## Fix

Update `src/components/visitors/VisitorActions.tsx`:

1. Remove the `isScheduledToday` restriction so that any visitor with `status === 'scheduled'` shows:
   - The quick **"Check In & Print"** button
   - The **Check In** dropdown menu item
2. Keep all other logic untouched (Approve/Reject for `pending_approval`, Check Out for `checked_in`, edit/print, etc.).
3. Drop the now-unused `isScheduledToday`/`today` constants.

No backend or RLS changes — `CheckInOut.tsx` already loads all `scheduled` visitors regardless of date, so future‑dated approved visits will appear consistently in both places.

## Technical notes

- File touched: `src/components/visitors/VisitorActions.tsx` only.
- Behavior: from the moment a host approves (status → `scheduled`), the security/admin user can Check In the visitor on any day — both on the Visitors page row actions and on the Check‑In/Out screen.
