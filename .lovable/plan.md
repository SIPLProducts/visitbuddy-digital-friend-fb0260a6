

# Badge Layout: "Visitor Pass" Title Left of Photo

## Summary
Change the photo section in both badge files so that "VISITOR PASS" title text appears on the left side and the visitor photo on the right, in a horizontal row.

## Changes

### 1. `src/components/badge/SafetyPermitBadge.tsx` (lines 120-130)
Replace the centered photo section with a flex row:
- Left side: "VISITOR PASS" text (bold, uppercase, centered vertically)
- Right side: Visitor photo/avatar (same size)
- Same border-bottom and background styling

### 2. `src/pages/PrintBadge.tsx` (lines 496-504)
Replace the `.photo-section` with a flex row layout:
- Left side: "VISITOR PASS" title
- Right side: Photo box
- Add CSS for the new `.title-photo-row` class

### 3. Restore safety guidelines (keep QR commented out)
Uncomment the safety points text while keeping only the QR code portion commented out in both files.

## Files Changed
- `src/components/badge/SafetyPermitBadge.tsx`
- `src/pages/PrintBadge.tsx`

