

# Fix Empty Print Preview & Adjust Badge Layout

## Problem
1. **Empty print preview**: `index.css` has `body * { visibility: hidden }` for print, then makes `#printable-badge` visible — but `PrintBadge.tsx` uses `className="badge"` with no `id="printable-badge"`. So the badge is hidden during print.
2. **Layout request**: User wants details section on the left and signatures section on the right (side by side), instead of the current stacked layout.

## Changes

### 1. `src/pages/PrintBadge.tsx` — Add `id="printable-badge"` to the badge div
- Change `<div className="badge">` to `<div className="badge" id="printable-badge">` (line 476)
- This makes the existing `index.css` print styles work correctly

### 2. `src/pages/PrintBadge.tsx` — Restructure details + signatures layout
- Wrap the details section and signatures section in a flex container so they sit side by side:
  - Details (left): visitor info rows
  - Signatures (right): three signature boxes stacked vertically
- Update CSS styles accordingly for the new layout

### 3. `src/components/badge/SafetyPermitBadge.tsx` — Same layout change
- Apply the same left-details / right-signatures layout to the SafetyPermitBadge component for consistency

## Files Changed
- `src/pages/PrintBadge.tsx` — Add printable ID + restructure layout
- `src/components/badge/SafetyPermitBadge.tsx` — Same layout restructure

