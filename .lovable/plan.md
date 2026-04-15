

# Update Badge Navigation Hint & Safety Guidelines Layout

## Summary
Three changes to both `PrintBadge.tsx` and `SafetyPermitBadge.tsx`:

1. **Navigation hint**: After the arrow in "Scan QR to navigate →", add "Safe to Assembly Point" so it reads: `Scan QR to navigate → Safe to Assembly Point`
2. **Remove the separate assembly point line**: Delete the `🚨 Assembly Point: Near Admin Building` line from the safety guidelines section
3. **Compact safety points into 2 lines** (2 points per line):
   - Line 1: `1. Your safety is your responsibility.  2. Always follow the safety procedures.`
   - Line 2: `3. Always keep company work place clean.  4. When in doubt, contact our official for instruction, guidance & training.`

## Changes

### `src/pages/PrintBadge.tsx`

**Line 599** — Update nav hint text:
```
Scan QR to navigate → Safe to Assembly Point
```

**Lines 608-623** — Restructure safety guidelines: combine 4 points into 2 lines, remove the `🚨 Assembly Point` paragraph (keep emergency contact).

### `src/components/badge/SafetyPermitBadge.tsx`

**Line 209** — Update nav hint text to match.

**Lines 224-233** — Same restructure: 2 lines of 2 points each, remove `🚨 Assembly Point` paragraph.

## Files Changed
- `src/pages/PrintBadge.tsx`
- `src/components/badge/SafetyPermitBadge.tsx`

