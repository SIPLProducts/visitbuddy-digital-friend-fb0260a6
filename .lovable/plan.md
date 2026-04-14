

# Show Approve/Reject Actions for Hosts In-App

## Problem
When a visitor is created with `pending_approval` status, the host only gets approve/reject links via WhatsApp. Inside the app (Dashboard and Visitors page), pending visitors are visible but there are **no Approve or Reject buttons** — the host has no way to act on them from within the application.

## Changes

### 1. Add Approve/Reject to `src/components/visitors/VisitorActions.tsx`
Add "Approve" and "Reject" dropdown menu items when `visitor.status === 'pending_approval'`. These will call the existing `approve-visitor` edge function.

New props: `onApprove` and `onReject` callbacks.

### 2. Add Approve/Reject handlers in `src/pages/Visitors.tsx`
Add `handleApprove` and `handleReject` functions that invoke the `approve-visitor` edge function, then refresh the list. Pass these as props to `VisitorActions`.

### 3. Add inline Approve/Reject buttons to `src/components/dashboard/PendingApprovals.tsx`
Add Approve and Reject buttons next to each pending visitor in the dashboard widget, so hosts can approve directly from the dashboard without navigating to the Visitors page.

### 4. Filter pending visitors by host for manager role
For managers (who are hosts), filter the `PendingApprovals` widget to only show visitors where the `host_id` matches the logged-in user's employee record. This requires looking up the employee by auth user email and filtering accordingly.

## Files Changed
- `src/components/visitors/VisitorActions.tsx` — Add approve/reject menu items
- `src/pages/Visitors.tsx` — Add approve/reject handlers
- `src/components/dashboard/PendingApprovals.tsx` — Add inline approve/reject buttons + host filtering

