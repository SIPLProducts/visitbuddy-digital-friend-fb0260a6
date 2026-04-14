

# Restrict Gate Security to Check In, Check Out, Print & View Only

## Problem
Gate Security users currently see Edit, Approve, and Reject actions in the Visitors page. They should only see: **View Details**, **Check In**, **Check Out**, and **Print Badge**.

## Changes

### 1. `src/components/visitors/VisitorActions.tsx`
Add a new `canEdit` prop (default `true`). When `false`, hide the Edit menu item. The approve/reject actions are already controlled by `onApprove`/`onReject` being undefined, so no change needed there.

### 2. `src/pages/Visitors.tsx` — Line ~662
Pass `canEdit={!isGateSecurityOnly}` to `VisitorActions` so Gate Security users don't see the Edit option:
```tsx
<VisitorActions
  visitor={visitor}
  onViewDetails={handleViewDetails}
  onEdit={handleEdit}
  onPrintBadge={handlePrintBadge}
  onCheckIn={handleCheckIn}
  onCheckOut={handleCheckOut}
  onCheckInAndPrint={handleCheckInAndPrint}
  onApprove={canApproveReject ? handleApprove : undefined}
  onReject={canApproveReject ? handleReject : undefined}
  canCheckInOut={isGateSecurity}
  canEdit={!isGateSecurityOnly}
/>
```

## Result
Gate Security sees only: View Details, Check In, Check Out, Print Badge. All other roles keep full access including Edit and Approve/Reject.

