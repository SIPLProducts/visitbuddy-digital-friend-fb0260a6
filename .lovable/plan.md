

# Fix Print Badge Overflowing to 2 Pages

## Problem
The badge content (including the consent text) is too tall and spills onto a second page when printing in A4 landscape mode.

## Solution
Reduce spacing and font sizes throughout the badge to ensure everything fits on a single page. Key changes:

### `src/pages/PrintBadge.tsx`

1. **Reduce detail row padding** — Change `.detail-row` padding from `6px` to `4px` (line 372)
2. **Reduce detail font size** — Change `.details` font-size from `11px` to `10px` (line 368)
3. **Reduce guidelines padding** — Change `.guidelines-text` padding from `8px` to `4px 8px` (line 409)
4. **Reduce consent text padding** — Change `.consent-text` padding from `6px 8px` to `4px 6px` (line 439)
5. **Reduce consent font size** — Change from `7.5px` to `7px` (line 436)
6. **Reduce location row padding** — Change from `6px 8px` to `4px 6px` (line 454)
7. **Reduce photo size** — Change photo from `80px` to `64px` (lines 348-349, 353-354)
8. **Reduce header/title padding** — Tighten logo box and title row padding
9. **Add `page-break-inside: avoid` to `.badge`** in print media query (already partially there at line 277, ensure it works)
10. **Reduce sig-line min-height** from `40px` to `24px` (line 395)

All changes are CSS-only tweaks to compact the badge vertically so it fits on one A4 landscape page.

## Files Changed
- `src/pages/PrintBadge.tsx` — CSS spacing and font size reductions

