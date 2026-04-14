

# Hide Pending Approvals Widget & Approve/Reject for Gate Security

## Summary
For Gate Security users, hide the entire Pending Approvals dashboard widget (since they cannot act on it) and ensure no Approve/Reject actions are visible anywhere.

## Changes

### 1. `src/components/dashboard/PendingApprovals.tsx`
- Import `useUserRoles` hook
- Add `isGateSecurityOnly` check (same pattern as Visitors.tsx)
- If user is gate_security only, return `null` — hide the entire widget since they have no actions to take on pending visitors

### 2. `src/pages/Visitors.tsx` (already done)
- No further changes needed — Approve/Reject buttons are already hidden for gate_security role from the previous change

This is a small change: gate security users simply won't see the Pending Approvals card on the dashboard at all.

