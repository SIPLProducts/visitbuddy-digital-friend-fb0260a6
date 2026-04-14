

# Remove Approve/Reject from All Internal Roles — Host-Only Approval

## Summary
Approve and Reject actions for `pending_approval` visitors should only be available to the **host** (via the external approval link sent to their WhatsApp/Email). No logged-in role — gate security, admin, manager, or operator — should see approve/reject buttons in the app. The existing `ApproveVisitor` page (public host link) remains unchanged.

## Changes

### 1. `src/pages/Visitors.tsx`
- **Remove** the inline Approve/Reject buttons for `pending_approval` visitors (lines 648-669). Replace with an "Awaiting Host Approval" badge for **all** roles, not just gate security.
- **Remove** the "Approve Selected" option from bulk actions dropdown (line 360).
- **Remove** `handleApprove`, `handleReject`, and `handleBulkApprove` functions (no longer needed in this page).

### 2. `src/components/dashboard/PendingApprovals.tsx`
- **Remove** the Approve/Reject buttons and swipe actions entirely. This widget should be read-only for all internal users — showing pending visitors as an informational list only.
- Remove `handleApprove` and `handleReject` functions.
- Remove `SwipeableCard` usage; render plain cards instead.
- Keep the widget visible for admins/managers so they can see pending visitors, but with no action buttons — just an "Awaiting Host Approval" badge.

### 3. `src/components/dashboard/RecentVisitors.tsx`
- Remove any approve/reject swipe actions or dropdown items for `pending_approval` visitors (if present).

### What stays unchanged
- `src/pages/ApproveVisitor.tsx` — the public host approval page continues to work as-is. Hosts approve/reject via the link sent to their WhatsApp/Email.
- `supabase/functions/approve-visitor/index.ts` — the edge function remains, it's called by the host approval page.

