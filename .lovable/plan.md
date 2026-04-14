

# Restrict Check-In/Check-Out to Gate Security Role Only

## Summary
Only users with the `gate_security` role should see and use Check-In / Check-Out actions. All other roles (admin, manager, operator) will no longer see these options.

## Changes

### 1. `src/pages/Visitors.tsx`
- Add an `isGateSecurity` flag (true if user has `gate_security` role OR is HO admin)
- Pass this flag to `VisitorActions` as a new prop `canCheckInOut`
- Only call check-in/check-out handlers when the user has gate security role

### 2. `src/components/visitors/VisitorActions.tsx`
- Add optional `canCheckInOut` prop (defaults to `true` for backward compat)
- Hide "Check In & Print" button, "Check In", and "Check Out" dropdown items when `canCheckInOut` is `false`

### 3. `src/components/dashboard/RecentVisitors.tsx`
- Import `useUserRoles` hook
- Add `isGateSecurity` check
- Hide check-in/check-out swipe actions and dropdown menu items for non-gate-security users
- Keep "View Details" and "Print Badge" visible for all roles

### 4. `src/pages/Vehicles.tsx` (vehicle check-in/out)
- Same pattern: import `useUserRoles`, add gate security check
- Hide vehicle check-in/check-out dropdown items for non-gate-security roles

Note: HO Admin will retain access to all actions as an override.

