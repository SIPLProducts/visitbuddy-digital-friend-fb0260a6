
# Fix black RESl logo area not appearing in print/PDF

## Root cause
The black area is already set in `src/pages/PrintBadge.tsx`, but it is only a CSS background on `.logo-box`. Browsers often drop CSS backgrounds in print and “Save as PDF”, so it looks correct on screen but disappears in printed output.

## Changes
### `src/pages/PrintBadge.tsx`
1. Replace the CSS-only black logo background with a printable logo lockup:
   - render the RESL logo inside an inline SVG (or equivalent embedded graphic)
   - include a solid black rectangle inside that graphic behind the existing logo
   - keep the same visual size so the badge still fits on one page

2. Strengthen print rendering rules:
   - add `-webkit-print-color-adjust: exact`
   - add `print-color-adjust: exact`
   - apply them to the badge/logo area and in the `@media print` block

3. Keep current compact badge sizing unchanged so the single-page print fix is not affected.

## Technical details
- Current `.logo-box { background-color: #000000; }` is present, so this is not a missing-style bug.
- The reliable fix is to make the black area part of the rendered graphic instead of depending only on CSS background printing.
- If needed, the same logo treatment can be mirrored later in `SafetyPermitBadge.tsx` for consistency, but the main fix is in the print route.

## Expected result
The RESL logo section will stay black in:
- browser print preview
- saved PDF
- actual printed paper
