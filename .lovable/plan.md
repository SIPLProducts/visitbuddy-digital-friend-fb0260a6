

# Fix Two Badges Printing Side-by-Side on A4 Landscape

## Problem
The print preview doesn't show the two badges correctly. The `index.css` print rules set `#printable-badge` to `position: absolute` and `width: 100%`, but the individual `.badge` children don't have print-specific width constraints. Combined with the inline styles in `PrintBadge.tsx`, the badges may overflow or not appear properly.

## Solution
Ensure both `index.css` and `PrintBadge.tsx` print styles are aligned — the container uses flexbox with centered layout, and each badge is sized to ~125mm so both fit on A4 landscape (297mm wide) with a 12mm gap between them.

## Changes

### 1. `src/index.css` — Update print rules for `#printable-badge`
- Add `.badge` child sizing: `width: 125mm !important`
- Keep `position: absolute; left: 0; top: 0` for proper print positioning
- Ensure `align-items: flex-start` so badges align to top

### 2. `src/pages/PrintBadge.tsx` — Ensure print CSS doesn't conflict
- Verify the inline `@media print` block's `.badge` width matches `index.css`
- Add `!important` to `.print-container` flex rules to override any defaults
- Ensure both badges render identically with proper gap

## Files Changed
- `src/index.css` — Add `.badge` width rule inside the `#printable-badge` print block
- `src/pages/PrintBadge.tsx` — Sync inline print styles with global rules

