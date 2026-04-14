

# Set New Visitor Status to "Pending Approval" & Trigger Host Notification

## Summary
When a visitor is created via the normal registration form, set status to `pending_approval` instead of `scheduled`. Then call the `notify-host` edge function so the host receives a WhatsApp/SMS with approve/reject links — the same flow that already works for self-service visitors.

## Changes

### 1. `src/pages/NewVisitor.tsx`
- Change `status: 'scheduled'` to `status: 'pending_approval'` in the insert payload (line 150)
- After successful insert, invoke the `notify-host` edge function with the new visitor's ID and host details (similar to the self-service flow) so the host gets the approval request
- Update success toast to say "Visitor registered — pending host approval"
- Skip the WhatsApp badge send (badge should only be sent after approval, which the `approve-visitor` function already handles)

### 2. No database or edge function changes needed
- The `visitors` table already supports `pending_approval` status
- The `notify-host` edge function already sends approval links to the host
- The `approve-visitor` edge function already handles approval → status change to `scheduled` + badge delivery
- The `PendingApprovals` dashboard widget already shows pending visitors

## Flow after change
1. Operator fills form → visitor created with `pending_approval`
2. Host notified via WhatsApp/SMS with approve/reject links
3. Host approves → status becomes `scheduled`, badge sent automatically
4. Visitor shows up and gets checked in

