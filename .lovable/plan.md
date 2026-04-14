

# Auto-Show Approved Visitors for Security Check-In

## Problem
When a host approves a visitor whose Date of Visit is today, the security user doesn't automatically see the visitor ready for check-in. They have to manually refresh the Visitors page. The Dashboard has realtime updates but the Visitors page does not.

## Changes

### 1. Add Realtime Subscription to `src/pages/Visitors.tsx`
Subscribe to `postgres_changes` on the `visitors` table so that when a host approves a visitor (status changes from `pending_approval` to `scheduled`), the list auto-refreshes for security users.

```tsx
// Inside useEffect, add realtime channel
const channel = supabase
  .channel('visitors-page-realtime')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'visitors' }, () => {
    fetchVisitors();
  })
  .subscribe();

return () => { supabase.removeChannel(channel); };
```

### 2. Default filter for Gate Security role in `src/pages/Visitors.tsx`
For gate security users, default the status filter to show `scheduled` visitors (ready for check-in) so approved visitors for today appear prominently. Also default the date filter to today.

```tsx
// After role detection
useEffect(() => {
  if (isGateSecurityOnly) {
    setStatusFilter('scheduled');
    setFromDate(new Date());
    setToDate(new Date());
  }
}, [isGateSecurityOnly]);
```

### 3. No database changes needed
The approve-visitor edge function already sets status to `scheduled` and sends notifications to gate security users. The check-in button logic already checks `isScheduledToday` correctly.

## Result
When a host approves a visitor with today's Date of Visit, the security user's Visitors page will automatically refresh and show the visitor with a "Check In" action available — no manual refresh needed.

