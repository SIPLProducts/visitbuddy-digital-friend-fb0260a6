

# Fix Missing Approve/Reject Buttons for Admin/Host Users

## Root Cause Analysis
Two issues contribute to this problem:
1. The `useUserRoles` hook loads roles asynchronously, but the Visitors page doesn't gate rendering on the `loading` state — buttons may be computed before role data is ready.
2. The WhatsApp approval link auto-processes immediately (ApproveVisitor.tsx line 38), so visitors may already be `scheduled` by the time the host opens the app.

## Changes

### 1. `src/pages/Visitors.tsx` — Wait for roles to load
- Destructure `loading` from `useUserRoles()`
- Show a loading state while roles are being fetched, ensuring `canApproveReject` is only computed with actual role data
- Guard `isGateSecurityOnly` with `!loading` so it defaults to showing buttons until roles confirm otherwise

### 2. `src/pages/Visitors.tsx` — Read URL status param
- The PendingApprovals dashboard widget links to `/visitors?status=pending_approval` but the Visitors page ignores URL params
- Read `status` from `useSearchParams` and set `statusFilter` accordingly so the admin lands directly on pending visitors

### 3. `src/pages/ApproveVisitor.tsx` — Stop auto-approving from URL
- Remove the auto-process behavior (lines 38-39) that immediately approves/rejects when `action` param is in the URL
- Instead, show the visitor details with Approve/Reject buttons, requiring the host to manually click — preventing accidental auto-approvals that clear the pending status before the admin can act in-app

## Files Changed
- `src/pages/Visitors.tsx` — Add role loading guard + URL param handling
- `src/pages/ApproveVisitor.tsx` — Remove auto-approval from URL action param

