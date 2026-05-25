## Problem

Across **every plant**, after yesterday's Admin Head read-only rollout, the Visitors list no longer shows **Check In** / **Check In & Print** for plant security accounts (e.g. `security.piwmpl@resustainability.com`). HO Admin still sees the buttons. Same broken behaviour on PIWMPL, PIWHPL, every site.

## Why it broke (same cause for all plants)

In `src/pages/Visitors.tsx` the row capability was tightened to:

```ts
canCheckInOut = !isReadOnly && (isGateSecurity || hostMatch)
```

`isGateSecurity` is only `true` when the user has a role row whose enum is literally `gate_security`. HO Admin is hard-coded true in the hook, which is why HO Admin is unaffected.

Plant security accounts on the deployed server are provisioned with `role = 'operator'` (or `manager`) at the plant — not the enum `gate_security`. So on every plant:

- `isGateSecurity = false`
- security user is not the host → host-match false
- → `canCheckInOut = false`
- → Check In / Check In & Print hidden in the row + dropdown

Before yesterday the dropdown's Check In item did not require `canEdit` / `canCheckInOut`, so these operator/manager security accounts could still check in. Yesterday's read-only work added `canEdit && canCheckInOut` to every quick action and dropdown item in `src/components/visitors/VisitorActions.tsx`, which silently disabled this path for all plants.

## Fix (frontend only, applies uniformly to every plant)

Broaden "can perform gate operations" to cover the operational roles, while keeping Admin Head strictly read-only and not exposing Approve/Reject to security.

### 1. `src/pages/Visitors.tsx`
Add a memo:
```ts
const canPerformGateOps = useMemo(() => {
  if (isHoAdmin) return true;
  if (isReadOnly) return false; // Admin Head stays read-only
  return userRoles.some(r =>
    ['admin', 'manager', 'operator', 'gate_security'].includes(r.role)
  );
}, [isHoAdmin, isReadOnly, userRoles]);
```
Update the row prop:
```tsx
canCheckInOut={!isReadOnly && (canPerformGateOps || (!!hostEmployeeId && visitor.host_id === hostEmployeeId))}
```
Leave `isGateSecurityOnly` (today-default filter) and `canApproveReject` unchanged.

### 2. `src/pages/CheckInOut.tsx`
Mirror the same `canPerformGateOps` memo and use it to enable check-in/out + photo-capture controls (kept under the existing `!isReadOnly` guard).

### 3. No changes to
- `VisitorActions.tsx` internal logic
- DB / RLS / migrations (UPDATE policies already allow location-scoped users on every plant)
- Admin Head read-only behavior
- HO Admin behavior
- Approve / Reject visibility for security accounts

## Verification (run per plant)

Sign in as the plant security account (e.g. `security.piwmpl@resustainability.com`, then repeat for PIWHPL, etc.):
- Approved visitor scheduled for today shows **Check In & Print** and the kebab menu shows **Check In**.
- Approve / Reject remain hidden.
- Admin Head account → still strictly read-only (no Check In anywhere).
- HO Admin (`bala@…`) → unchanged.
