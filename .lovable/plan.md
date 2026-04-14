

# Single Badge on Right Side of A4 Landscape

## What changes
Print only **one** badge, positioned on the **right half** of the A4 landscape sheet. This way the user can print on the left half first (by feeding the paper), then flip/re-feed and print the second visitor on the right half — getting two badges on one physical sheet.

## Changes

### 1. `src/pages/PrintBadge.tsx`
- Remove the `[0, 1].map(...)` loop — render only **one** badge
- Update inline print CSS: remove dual-badge flex/gap rules, set badge width to ~130mm, and add `margin-left: auto` to push it to the right side

### 2. `src/index.css`
- Update `#printable-badge` print rules: use `display: flex`, `justify-content: flex-end` to position content on the right
- Update `.badge` width to ~130mm
- Remove the `flex-shrink` and gap rules meant for two badges

## Files Changed
- `src/pages/PrintBadge.tsx` — Single badge, right-aligned print layout
- `src/index.css` — Right-align print container

