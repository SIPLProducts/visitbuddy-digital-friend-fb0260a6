## Goal
Make the accompanying-visitor counts visible in more places, not just on the Dashboard's "Recent Visitors" rows. Today the data is loaded but the headline stats and the main Visitors list table don't show how many guests are involved.

## Changes

### 1. Dashboard stat tiles (`src/pages/Dashboard.tsx`)
- "Today's Visitors" StatCard — append a sub-line: `+ N guests` using `filteredStats.guestsToday` (only when > 0).
- "Active Check-ins" StatCard — append a sub-line: `+ N guests inside` using `filteredStats.guestsInside` (only when > 0).
- Keep the existing "Total People Inside" tile as-is (already shows primary + guests).
- Use the `UsersRound` icon already imported, muted-foreground text styling, small `text-xs` line to stay within the StatCard footprint.

### 2. Visitors list table (`src/pages/Visitors.tsx`)
- Add a new "Guests" column header between "Laptop" and "Status".
- Cell content:
  - If `visitor.accompanying_count > 0`: show a pill `+N` with `UsersRound` icon and a Tooltip listing guest names (first 5 + "+X more"), reusing the same Tooltip pattern already implemented inline on the visitor name (lines 632–650).
  - Else show `—`.
- Update the `colSpan={14}` placeholders to `colSpan={15}` for loading / empty rows.

### 3. Footer summary row (optional, low-risk)
- Below the Visitors table filters, add a small summary chip: `Showing X visitors · Y guests` where Y = sum of `accompanying_count` across `filteredVisitors`. Helps security see total facility headcount in the filtered scope.

## Technical notes
- No DB changes, no RLS changes — `accompanying_count` and the `accompanying` relation are already fetched on both pages.
- Real-time channel for `accompanying_visitors` already exists on the Dashboard; the Visitors page already refreshes via the `visitors` realtime channel (the count column on `visitors` is updated by app code when guests are saved).
- Reuse existing tokens (indigo pill, `UsersRound`, `Badge variant="secondary"`).

## Out of scope
- No changes to badge printing, check-in/out dialog, reports, or registration flow.
- No schema or edge-function changes.
