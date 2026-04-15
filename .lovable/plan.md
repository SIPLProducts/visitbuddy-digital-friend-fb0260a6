

# Badge Printing Cleanup

## Summary
Three changes to the SafetyPermitBadge component: remove the "SAFETY PERMIT / VISITOR" label section, remove the Security/Visitor/Officer signature boxes on the right side, and comment out the check-out QR section.

## Changes

### `src/components/badge/SafetyPermitBadge.tsx`

1. **Remove "SAFETY PERMIT / VISITOR" title block** (lines 120-136)
   - Delete the entire `<div className="flex border-b-2 border-gray-800">` block containing the "SAFETY PERMIT" heading and "VISITOR" subtitle
   - Move the photo/avatar into the details section or keep it in the header area

2. **Remove Signatures column** (lines 197-211)
   - Delete the right-side `<div className="w-[100px] border-l-2 ...">` containing Security, Visitor, and Officer signature boxes
   - The details section will now span full width

3. **Comment out Check-out QR section** (lines 232-254)
   - Comment out the `<div className="flex border-t-2 border-gray-800 bg-gray-100">` block containing the safety guidelines text and the check-out QR code
   - Keep the code for future re-enablement

## Files Changed
- `src/components/badge/SafetyPermitBadge.tsx`

