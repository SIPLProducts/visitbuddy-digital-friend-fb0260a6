

# Fix Print Preview & Fit Badge on Half A4 Sheet

## Problem
1. **Print preview shows different content than screen**: The `index.css` has a global `@media print { body * { visibility: hidden } }` rule that conflicts with the inline print styles in `PrintBadge.tsx`. The global rule hides everything first, and while `#printable-badge` is made visible, there may be specificity/ordering issues.
2. **Badge should fit on half an A4 page horizontally**: The user wants the badge to print on a single page, using only the left half of an A4 sheet in landscape orientation (i.e., approximately 148mm × 210mm, like A5 portrait).

## Changes

### 1. `src/pages/PrintBadge.tsx` — Fix print styles and resize for half-A4
- Update the inline `@page` rule to `size: A4 landscape` so it prints on A4
- Set the badge width to ~48% of the page (half of A4 landscape width) so it occupies the left half
- Add explicit print styles: hide everything except `#printable-badge`, ensure all children are visible
- Override the global `index.css` print rules with higher-specificity inline styles
- Scale font sizes and padding slightly to ensure all content fits in a single half-page

### 2. `src/index.css` — Scope the global print rule to avoid conflicts
- Wrap the first `@media print` block (for Safety Permit Badge) so it only applies when `#printable-badge` is present, using `body:has(#printable-badge)` — similar to how the proposal document print styles already work
- This prevents the global `body * { visibility: hidden }` from interfering with other print scenarios

### 3. `src/components/badge/SafetyPermitBadge.tsx` — Match print sizing
- Add a print-specific class or inline style so when this component is printed (e.g., from the Visitors page), it also fits the half-A4 format

## Files Changed
- `src/pages/PrintBadge.tsx` — Update `@page` size, badge width, and print visibility rules
- `src/index.css` — Scope global print rules with `:has(#printable-badge)`

