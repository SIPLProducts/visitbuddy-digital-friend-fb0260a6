

# Add Black Background to RESL Logo in Print Badge

## Summary
Add a black background color to the `.logo-box` container in `PrintBadge.tsx` so the red "re" logo displays on a black background, matching the uploaded reference image.

## Changes

### `src/pages/PrintBadge.tsx` (line 300-307)
Add `background-color: #000000;` to the `.logo-box` CSS rule.

## Files Changed
- `src/pages/PrintBadge.tsx`

