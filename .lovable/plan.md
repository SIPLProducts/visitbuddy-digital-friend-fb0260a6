

# Add Back "Officer" Signature Box to Both Badge Components

## Summary
Re-add the "Officer" signature box (with a signature line) to both `SafetyPermitBadge.tsx` and `PrintBadge.tsx`. Only "Officer" — not "Security" or "Visitor".

## Changes

### 1. `src/components/badge/SafetyPermitBadge.tsx`
- After the details `</div>` (line 189), before the closing `</div>` of the flex container (line 191), add a right-side column with a single "Officer" signature box:
  - 100px wide, border-left, containing a signature line and "Officer" label

### 2. `src/pages/PrintBadge.tsx`
- After the details `</div>` (line 541), before the closing `</div>` of `details-signatures-row` (line 543), add a matching "Officer" signature box using inline CSS classes
- Add corresponding CSS styles for the officer signature box

## Files Changed
- `src/components/badge/SafetyPermitBadge.tsx` — Add Officer signature column
- `src/pages/PrintBadge.tsx` — Add Officer signature column + CSS

