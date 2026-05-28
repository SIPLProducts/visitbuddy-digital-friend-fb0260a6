## Goal
Show on the dashboard how many **active gates** exist across how many **active plants (locations)**, respecting the currently selected location.

## What the user will see
A new stat card in the top stats grid:

- **Title:** "Active Gates"
- **Value:** number of gates with `status = 'active'` in scope
- **Subtitle:** "across N active plants" (N = number of active locations in scope)

Scope rules:
- When "All Locations" is selected → count all active gates across all active plants the user can see.
- When a specific location is selected → count active gates at that one plant; subtitle shows "across 1 active plant" (or hides the count and shows the plant name).

## Where it goes
`src/pages/Dashboard.tsx`, inside the existing Stats Grid (the `grid ... xl:grid-cols-7` block). The grid will become `xl:grid-cols-8` to fit one more card cleanly, keeping the responsive layout for smaller breakpoints intact.

## Technical notes
- `gates` is already fetched in `fetchDashboardData`; derive `activeGatesCount` from `filteredGates.filter(g => g.status === 'active')`.
- `locations` is already fetched via `fetchLocations`; derive `activePlantsCount`:
  - All Locations → `locations.filter(l => l.status === 'active').length`
  - Single location → `1` if that location is active, else `0`.
- Add one `<StatCard>` (icon: `DoorOpen` from lucide-react, color e.g. `indigo`/`teal`) — pure presentation, no schema or backend changes.

## Out of scope
- No DB migrations.
- No changes to the existing `GateStatus` panel at the bottom.
- No changes to filtering logic or other cards.
