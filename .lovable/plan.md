

# Restore Original 4-Point Safety Guidelines Layout

## Problem
The safety guidelines are currently merged into 2 lines (2 points per line), which doesn't print cleanly. Need to restore to the original layout where each point is on its own line.

## Changes

### `src/pages/PrintBadge.tsx` (lines 610-611)
Replace the 2-line layout with 4 separate lines:
```html
<p>1. Your safety is your responsibility.</p>
<p>2. Always follow the safety procedures.</p>
<p>3. Always keep company work place clean.</p>
<p>4. When in doubt, contact our official for instruction, guidance & training.</p>
```

### `src/components/badge/SafetyPermitBadge.tsx` (lines 224-225)
Same change — restore 4 separate `<p>` tags, one per safety point.

## Files Changed
- `src/pages/PrintBadge.tsx`
- `src/components/badge/SafetyPermitBadge.tsx`

