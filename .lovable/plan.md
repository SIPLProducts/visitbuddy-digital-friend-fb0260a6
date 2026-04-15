

# Fix PrintBadge.tsx: Remove Labels, Signatures, Comment Out Checkout QR

## Summary
The `PrintBadge.tsx` page has its own inline HTML badge (not using the `SafetyPermitBadge` component). It still contains the "SAFETY PERMIT / VISITOR" title, the Security/Visitor/Officer signature boxes, and the checkout QR section. These need to match the changes already made to `SafetyPermitBadge.tsx`.

## Changes

### `src/pages/PrintBadge.tsx`

1. **Remove "SAFETY PERMIT / VISITOR" title block** (lines 517-529)
   - Delete the `title-row` div containing "SAFETY PERMIT" heading and "VISITOR" subtitle
   - Keep the photo box but move it into a standalone centered section (similar to SafetyPermitBadge)

2. **Remove Signatures column** (lines 588-601)
   - Delete the `<div className="signatures">` block with Security, Visitor, Officer sig boxes
   - Remove related CSS styles (`.signatures`, `.sig-box`, `.sig-line`, `.sig-label`)

3. **Comment out Checkout QR + Safety Guidelines section** (lines 617-638)
   - Comment out the entire `<div className="guidelines">` block containing safety text and checkout QR code
   - Keep code for future re-enablement

## Files Changed
- `src/pages/PrintBadge.tsx` — Remove title, signatures, comment out checkout section

