

# Restrict Check-In to Matching Scheduled Date

## Summary
When a host creates a visitor with a future `scheduled_date`, gate security can see the visitor in the list but cannot check them in until the system date matches the visitor's scheduled date. The "Check In & Print" button and check-in/check-out dropdown items will only appear when `scheduled_date` equals today.

## Changes

### 1. `src/components/visitors/VisitorActions.tsx`
- Add a date comparison helper: check if `visitor.scheduled_date` matches today's date (using local date string comparison)
- Gate the "Check In & Print" button, "Check In", and "Check Out" dropdown items behind an additional `isScheduledToday` condition
- For visitors whose `scheduled_date` is in the future, these actions will not render
- Check-out for `checked_in` visitors should still work regardless of date (they were already checked in)

### 2. `src/components/dashboard/RecentVisitors.tsx`
- Apply the same `isScheduledToday` check in the swipe actions and dropdown menu items
- Only show check-in swipe/dropdown when the visitor's scheduled date is today

### Logic
```text
isScheduledToday = visitor.scheduled_date is null OR visitor.scheduled_date === today's date (YYYY-MM-DD)

Show "Check In & Print": canCheckInOut AND status === 'scheduled' AND isScheduledToday
Show "Check In" dropdown: canCheckInOut AND (status === 'scheduled' || 'checked_out') AND isScheduledToday
Show "Check Out" dropdown: canCheckInOut AND status === 'checked_in' (no date restriction — already checked in)
```

This ensures future-dated visitors are visible but not actionable until their visit date arrives.

