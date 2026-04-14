

# Show Approve/Reject for All Roles Except Gate Security

## Problem
Currently, approve/reject is restricted to managers only. The user wants ALL roles (HO Admin, Admin, Manager, Operator) to have approve/reject capability — excluding only Gate Security.

## Changes

### 1. `src/pages/Visitors.tsx` — Line 221
Update `canApproveReject` to allow all roles except gate security:
```tsx
// Before
const canApproveReject = isHoAdmin || isManagerOnly || userRoles.some(r => r.role === 'admin');

// After
const canApproveReject = !isGateSecurityOnly;
```

### 2. `src/components/dashboard/PendingApprovals.tsx` — Line 120
The widget already hides for gate security (`isGateSecurityOnly`). Remove the manager-only host filtering so all non-security roles see all pending visitors:
- Remove the `isManagerOnly` check that filters by `hostEmployeeId`
- Keep the gate security exclusion as-is
- All other roles (HO Admin, Admin, Manager, Operator) will see pending visitors and can approve/reject

### Files Changed
- `src/pages/Visitors.tsx` — Update `canApproveReject` condition
- `src/components/dashboard/PendingApprovals.tsx` — Remove manager-only filtering restriction

