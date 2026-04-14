

# Hide Check-In & Approve Actions for Gate Security on Pending Visitors

## Summary
For users with the `gate_security` role, hide the "Approve/Reject" buttons and "Check In & Print" actions for visitors that are still in `pending_approval` status. Gate Security should only see View Details for pending visitors. Check-in actions should only appear once the host has approved (status = `scheduled`).

## Changes

### 1. `src/pages/Visitors.tsx`
- Import `useUserRoles` hook to detect the current user's role
- In the actions column (around line 670), add a role check: if the user is `gate_security`, do NOT show the Approve/Reject buttons for `pending_approval` visitors — show only a "Pending Approval" label or View Details instead
- The existing `VisitorActions` component already correctly shows "Check In & Print" only for `scheduled` status, so no change needed there

### 2. `src/components/visitors/VisitorActions.tsx`
- No changes needed — the component already gates "Check In & Print" behind `visitor.status === 'scheduled'`, which only happens after host approval

## Technical Detail
- `useUserRoles()` provides `userRoles` array with role info; check if any role is `gate_security` and none are `admin`/`manager`/`operator`
- For gate_security users viewing `pending_approval` visitors: show a disabled "Awaiting Approval" badge instead of Approve/Reject buttons
- All other roles (admin, manager, operator) continue to see Approve/Reject as before

