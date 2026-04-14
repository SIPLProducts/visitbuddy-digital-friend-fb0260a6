

# Fix Print Preview Showing Empty/Wrong Content

## Problem
The `PrintBadge.tsx` inline print CSS has `body *, body { visibility: visible !important; }` which overrides the `index.css` rule that hides everything except `#printable-badge`. This conflict causes the print preview to either show everything (buttons, background) or show nothing depending on CSS load order.

## Solution
Remove the conflicting inline print styles from `PrintBadge.tsx` and rely solely on the already-correct `index.css` rules. The `index.css` already has proper scoped rules using `body:has(#printable-badge)` that:
1. Hide all elements
2. Show only `#printable-badge` and its children
3. Position it at top-left with 140mm width

## Changes

### `src/pages/PrintBadge.tsx` — Fix inline print CSS (lines 260-281)
Replace the current conflicting `@media print` block:
```css
/* REMOVE this — it conflicts with index.css */
body *, body {
  visibility: visible !important;
}
```

Replace with a minimal block that only sets `@page` size and defers visibility to `index.css`:
```css
@media print {
  @page { 
    size: A4 landscape; 
    margin: 10mm; 
  }
  .no-print { display: none !important; }
}
```

The `index.css` already handles hiding everything, showing `#printable-badge`, positioning, and sizing at 140mm.

## Files Changed
- `src/pages/PrintBadge.tsx` — Remove conflicting inline print visibility rules

